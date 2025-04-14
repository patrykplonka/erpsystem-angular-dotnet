using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System.Linq;
using System.Threading.Tasks;
using erpsystem.Server.Data;
using Microsoft.Extensions.Caching.Memory;
using erpsystem.Server.Models.DTOs.erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public OrdersController(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
        {
            const string cacheKey = "Orders";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<OrderDto> orderDtos))
            {
                var orders = await _context.Orders
                    .Include(o => o.Contractor)
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.WarehouseItem)
                    .Where(o => !o.IsDeleted)
                    .ToListAsync();

                orderDtos = orders.Select(o => new OrderDto
                {
                    Id = o.Id,
                    OrderNumber = o.OrderNumber,
                    ContractorId = o.ContractorId,
                    ContractorName = o.Contractor != null ? o.Contractor.Name : "Brak kontrahenta",
                    OrderType = o.OrderType,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status,
                    CreatedBy = o.CreatedBy,
                    CreatedDate = o.CreatedDate,
                    IsDeleted = o.IsDeleted,
                    OrderItems = o.OrderItems.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        OrderId = oi.OrderId,
                        WarehouseItemId = oi.WarehouseItemId,
                        WarehouseItemName = oi.WarehouseItem != null ? oi.WarehouseItem.Name : "Brak produktu",
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        VatRate = oi.VatRate,
                        TotalPrice = oi.TotalPrice
                    }).ToList()
                }).ToList();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, orderDtos, cacheOptions);
            }

            return Ok(orderDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDto>> GetOrder(int id)
        {
            var cacheKey = $"Order_{id}";
            if (!_cache.TryGetValue(cacheKey, out OrderDto orderDto))
            {
                var order = await _context.Orders
                    .Include(o => o.Contractor)
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.WarehouseItem)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

                if (order == null)
                {
                    return NotFound();
                }

                orderDto = new OrderDto
                {
                    Id = order.Id,
                    OrderNumber = order.OrderNumber,
                    ContractorId = order.ContractorId,
                    ContractorName = order.Contractor != null ? order.Contractor.Name : "Brak kontrahenta",
                    OrderType = order.OrderType,
                    OrderDate = order.OrderDate,
                    TotalAmount = order.TotalAmount,
                    Status = order.Status,
                    CreatedBy = order.CreatedBy,
                    CreatedDate = order.CreatedDate,
                    IsDeleted = order.IsDeleted,
                    OrderItems = order.OrderItems.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        OrderId = oi.OrderId,
                        WarehouseItemId = oi.WarehouseItemId,
                        WarehouseItemName = oi.WarehouseItem != null ? oi.WarehouseItem.Name : "Brak produktu",
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        VatRate = oi.VatRate,
                        TotalPrice = oi.TotalPrice
                    }).ToList()
                };

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, orderDto, cacheOptions);
            }

            return Ok(orderDto);
        }

        [HttpPost]
        public async Task<ActionResult<OrderDto>> CreateOrder(OrderDto orderDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var warehouseItemIds = orderDto.OrderItems.Select(oi => oi.WarehouseItemId).Distinct().ToList();
            var warehouseItems = await _context.WarehouseItems
                .Where(wi => warehouseItemIds.Contains(wi.Id) && !wi.IsDeleted)
                .ToDictionaryAsync(wi => wi.Id, wi => wi.Price);

            var order = new Order
            {
                OrderNumber = orderDto.OrderNumber,
                ContractorId = orderDto.ContractorId,
                OrderType = orderDto.OrderType,
                OrderDate = orderDto.OrderDate,
                Status = orderDto.Status,
                CreatedBy = orderDto.CreatedBy,
                OrderItems = orderDto.OrderItems.Select(oi =>
                {
                    if (!warehouseItems.TryGetValue(oi.WarehouseItemId, out var unitPrice))
                    {
                        throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} nie istnieje lub jest usunięty.");
                    }

                    if (unitPrice <= 0)
                    {
                        throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} ma cenę 0. Zaktualizuj cenę w bazie danych.");
                    }

                    return new OrderItem
                    {
                        WarehouseItemId = oi.WarehouseItemId,
                        Quantity = oi.Quantity,
                        UnitPrice = unitPrice,
                        VatRate = oi.VatRate,
                        TotalPrice = oi.Quantity * unitPrice * (1 + oi.VatRate / 100)
                    };
                }).ToList()
            };

            order.TotalAmount = order.OrderItems.Sum(oi => oi.TotalPrice);

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Created",
                ModifiedBy = orderDto.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} created."
            };
            _context.OrderHistory.Add(history);
            await _context.SaveChangesAsync();

            _cache.Remove("Orders");

            orderDto.Id = order.Id;
            orderDto.TotalAmount = order.TotalAmount;
            orderDto.OrderItems.ForEach(oi => oi.OrderId = order.Id);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, orderDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, OrderDto orderDto)
        {
            if (id != orderDto.Id)
            {
                return BadRequest();
            }

            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

            if (order == null)
            {
                return NotFound();
            }

            var warehouseItemIds = orderDto.OrderItems.Select(oi => oi.WarehouseItemId).Distinct().ToList();
            var warehouseItems = await _context.WarehouseItems
                .Where(wi => warehouseItemIds.Contains(wi.Id) && !wi.IsDeleted)
                .ToDictionaryAsync(wi => wi.Id, wi => wi.Price);

            order.OrderNumber = orderDto.OrderNumber;
            order.ContractorId = orderDto.ContractorId;
            order.OrderType = orderDto.OrderType;
            order.OrderDate = orderDto.OrderDate;
            order.Status = orderDto.Status;

            _context.OrderItems.RemoveRange(order.OrderItems);
            order.OrderItems = orderDto.OrderItems.Select(oi =>
            {
                if (!warehouseItems.TryGetValue(oi.WarehouseItemId, out var unitPrice))
                {
                    throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} nie istnieje lub jest usunięty.");
                }

                if (unitPrice <= 0)
                {
                    throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} ma cenę 0. Zaktualizuj cenę w bazie danych.");
                }

                return new OrderItem
                {
                    OrderId = order.Id,
                    WarehouseItemId = oi.WarehouseItemId,
                    Quantity = oi.Quantity,
                    UnitPrice = unitPrice,
                    VatRate = oi.VatRate,
                    TotalPrice = oi.Quantity * unitPrice * (1 + oi.VatRate / 100)
                };
            }).ToList();

            order.TotalAmount = order.OrderItems.Sum(oi => oi.TotalPrice);

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Updated",
                ModifiedBy = orderDto.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} updated."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null || order.IsDeleted)
            {
                return NotFound();
            }

            order.IsDeleted = true;

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Deleted",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} marked as deleted."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");

            return NoContent();
        }

        [HttpGet("generate-order-number")]
        public async Task<IActionResult> GenerateOrderNumber([FromQuery] string orderType)
        {
            if (orderType != "Purchase" && orderType != "Sale")
            {
                return BadRequest(new { message = "Nieprawidłowy typ zamówienia." });
            }

            var cacheKey = $"OrderNumber_{orderType}_{DateTime.UtcNow:yyyyMMdd}";
            if (!_cache.TryGetValue(cacheKey, out string orderNumber))
            {
                var today = DateTime.UtcNow.ToString("yyyyMMdd");
                var prefix = orderType == "Purchase" ? "PO" : "SO";
                var pattern = $"{prefix}-{today}-%";

                var count = await _context.Orders
                    .Where(o => o.OrderNumber.StartsWith($"{prefix}-{today}-") && !o.IsDeleted)
                    .CountAsync();

                var sequence = (count + 1).ToString("D3");
                orderNumber = $"{prefix}-{today}-{sequence}";

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, orderNumber, cacheOptions);
            }

            return Ok(new { orderNumber });
        }

        [HttpPost("confirm/{id}")]
        public async Task<IActionResult> ConfirmOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Contractor)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

            if (order == null)
            {
                return NotFound(new { message = $"Zamówienie o ID {id} nie istnieje." });
            }

            if (order.Status != "Draft")
            {
                return BadRequest(new { message = "Tylko zamówienia w statusie Draft mogą być potwierdzone." });
            }

            if (order.Contractor == null)
            {
                return BadRequest(new { message = $"Kontrahent dla zamówienia o ID {id} nie istnieje. Sprawdź ContractorId." });
            }

            foreach (var item in order.OrderItems)
            {
                if (item.WarehouseItem == null)
                {
                    return BadRequest(new { message = $"Produkt o ID {item.WarehouseItemId} nie istnieje." });
                }

                if (order.OrderType == "Sale" && item.WarehouseItem.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Niewystarczająca ilość produktu {item.WarehouseItem.Name} w magazynie." });
                }

                if (order.OrderType == "Sale")
                {
                    item.WarehouseItem.Quantity -= item.Quantity;
                }

                var movement = new WarehouseMovements
                {
                    WarehouseItemId = item.WarehouseItemId,
                    MovementType = order.OrderType == "Purchase" ? WarehouseMovementType.PZ : WarehouseMovementType.WZ,
                    Quantity = item.Quantity,
                    Supplier = order.Contractor.Name,
                    DocumentNumber = order.OrderNumber,
                    Date = DateTime.UtcNow,
                    Description = $"Zamówienie {order.OrderType} - {order.OrderNumber}",
                    CreatedBy = order.CreatedBy,
                    Status = "Completed"
                };

                _context.WarehouseMovements.Add(movement);
            }

            order.Status = "Confirmed";

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Confirmed",
                ModifiedBy = order.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} confirmed."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");
            _cache.Remove("WarehouseItemsAll");

            return Ok(new { message = "Zamówienie zostało potwierdzone." });
        }

        [HttpPost("{id}/receive")]
        public async Task<IActionResult> ReceiveOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

            if (order == null)
            {
                return NotFound(new { message = $"Zamówienie o ID {id} nie istnieje." });
            }

            if (order.OrderType != "Purchase")
            {
                return BadRequest(new { message = "Tylko zamówienia typu Purchase mogą być przyjęte." });
            }

            if (order.Status != "Confirmed")
            {
                return BadRequest(new { message = "Tylko zamówienia w statusie Confirmed mogą być przyjęte." });
            }

            if (order.Status == "Received")
            {
                return BadRequest(new { message = "Zamówienie zostało już przyjęte." });
            }

            foreach (var item in order.OrderItems)
            {
                if (item.WarehouseItem == null)
                {
                    return BadRequest(new { message = $"Produkt o ID {item.WarehouseItemId} nie istnieje." });
                }

                item.WarehouseItem.Quantity += item.Quantity;
            }

            order.Status = "Received";

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Received",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} received."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");
            _cache.Remove("WarehouseItemsAll");

            return Ok(new { message = "Zamówienie zostało przyjęte." });
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetOrderHistory(int id)
        {
            var cacheKey = $"OrderHistory_{id}";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<OrderHistoryDto> history))
            {
                history = await _context.OrderHistory
                    .Where(h => h.OrderId == id)
                    .Select(h => new OrderHistoryDto
                    {
                        Id = h.Id,
                        OrderId = h.OrderId,
                        Action = h.Action,
                        ModifiedBy = h.ModifiedBy,
                        ModifiedDate = h.ModifiedDate,
                        Details = h.Details
                    })
                    .ToListAsync();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, history, cacheOptions);
            }

            return Ok(history);
        }

        [HttpPost("{id}/update-status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string newStatus)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null || order.IsDeleted)
                return NotFound();

            var validStatuses = new[] { "Draft", "Confirmed", "InProgress", "Shipped", "Completed", "Cancelled" };
            if (!validStatuses.Contains(newStatus))
                return BadRequest(new { message = "Nieprawidłowy status." });

            order.Status = newStatus;

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "StatusUpdated",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Status changed to {newStatus}."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");

            return Ok(new { message = $"Status zmieniony na {newStatus}." });
        }

        [HttpGet("report")]
        public async Task<IActionResult> GetOrderReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var cacheKey = $"OrderReport_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
            if (!_cache.TryGetValue(cacheKey, out var report))
            {
                var query = _context.Orders
                    .Include(o => o.Contractor)
                    .Where(o => !o.IsDeleted);

                if (startDate.HasValue)
                    query = query.Where(o => o.OrderDate >= startDate.Value);
                if (endDate.HasValue)
                    query = query.Where(o => o.OrderDate <= endDate.Value);

                report = await query
                    .GroupBy(o => o.Contractor.Name)
                    .Select(g => new
                    {
                        Contractor = g.Key,
                        TotalOrders = g.Count(),
                        TotalAmount = g.Sum(o => o.TotalAmount)
                    })
                    .ToListAsync();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, report, cacheOptions);
            }

            return Ok(report);
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            const string cacheKey = "DashboardStats";
            if (!_cache.TryGetValue(cacheKey, out var stats))
            {
                stats = new
                {
                    TotalOrders = await _context.Orders.CountAsync(o => !o.IsDeleted),
                    PendingOrders = await _context.Orders.CountAsync(o => o.Status == "Draft" && !o.IsDeleted),
                    TotalRevenue = await _context.Orders.Where(o => o.OrderType == "Sale" && !o.IsDeleted).SumAsync(o => o.TotalAmount)
                };

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, stats, cacheOptions);
            }

            return Ok(stats);
        }
    }
}