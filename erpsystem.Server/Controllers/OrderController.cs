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

        [HttpGet("paged")]
        public async Task<ActionResult<PagedResult<OrderDto>>> GetPagedOrders(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? contractorName = null,
            [FromQuery] string? orderType = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var query = _context.Orders
                .Include(o => o.Contractor)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .Where(o => !o.IsDeleted);

            if (!string.IsNullOrEmpty(contractorName))
                query = query.Where(o => o.Contractor.Name.Contains(contractorName));
            if (!string.IsNullOrEmpty(orderType))
                query = query.Where(o => o.OrderType == orderType);
            if (!string.IsNullOrEmpty(status))
                query = query.Where(o => o.Status == status);
            if (startDate.HasValue)
                query = query.Where(o => o.OrderDate >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(o => o.OrderDate <= endDate.Value);

            var totalItems = await query.CountAsync();
            var orders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var orderDtos = orders.Select(o => new OrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                ContractorId = o.ContractorId,
                ContractorName = o.Contractor?.Name ?? "Brak kontrahenta",
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
                    WarehouseItemName = oi.WarehouseItem?.Name ?? "Brak produktu",
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    VatRate = oi.VatRate,
                    TotalPrice = oi.TotalPrice
                }).ToList()
            }).ToList();

            return Ok(new PagedResult<OrderDto> { Items = orderDtos, TotalItems = totalItems });
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
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (order == null)
                    return NotFound();

                orderDto = new OrderDto
                {
                    Id = order.Id,
                    OrderNumber = order.OrderNumber,
                    ContractorId = order.ContractorId,
                    ContractorName = order.Contractor?.Name ?? "Brak kontrahenta",
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
                        WarehouseItemName = oi.WarehouseItem?.Name ?? "Brak produktu",
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
                return BadRequest(ModelState);

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
                Status = "Pending",
                CreatedBy = orderDto.CreatedBy,
                OrderItems = orderDto.OrderItems.Select(oi =>
                {
                    if (!warehouseItems.TryGetValue(oi.WarehouseItemId, out var unitPrice))
                        throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} nie istnieje lub jest usunięty.");

                    return new OrderItem
                    {
                        WarehouseItemId = oi.WarehouseItemId,
                        Quantity = oi.Quantity,
                        UnitPrice = unitPrice,
                        VatRate = oi.VatRate,
                        TotalPrice = oi.Quantity * unitPrice * (1 + oi.VatRate)
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

        [HttpPost("confirm/{id}")]
        public async Task<IActionResult> ConfirmOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .Include(o => o.Contractor) // Ensure Contractor is included
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound();

            if (order.Status != "Pending")
                return BadRequest("Only pending orders can be confirmed.");

            order.Status = "Confirmed";

            var invoice = new Invoice
            {
                OrderId = order.Id,
                InvoiceNumber = $"INV-{order.OrderNumber}",
                IssueDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(14),
                ContractorId = order.ContractorId,
                ContractorName = order.Contractor?.Name ?? throw new InvalidOperationException("Contractor name cannot be null."), // Ensure ContractorName is set
                TotalAmount = order.TotalAmount,
                VatAmount = order.OrderItems.Sum(oi => oi.TotalPrice * oi.VatRate),
                NetAmount = order.TotalAmount - order.OrderItems.Sum(oi => oi.TotalPrice * oi.VatRate),
                Status = "Issued",
                CreatedBy = order.CreatedBy,
                CreatedDate = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Confirmed",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} confirmed and invoice created."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();
            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");

            return NoContent();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, OrderDto orderDto)
        {
            if (id != orderDto.Id)
                return BadRequest();

            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound();

            var warehouseItemIds = orderDto.OrderItems.Select(oi => oi.WarehouseItemId).Distinct().ToList();
            var warehouseItems = await _context.WarehouseItems
                .Where(wi => warehouseItemIds.Contains(wi.Id) && !wi.IsDeleted)
                .ToDictionaryAsync(wi => wi.Id, wi => wi.Price);

            order.OrderNumber = orderDto.OrderNumber;
            order.ContractorId = orderDto.ContractorId;
            order.OrderType = orderDto.OrderType;
            order.OrderDate = orderDto.OrderDate;
            order.Status = orderDto.Status;
            order.IsDeleted = orderDto.IsDeleted;

            _context.OrderItems.RemoveRange(order.OrderItems);
            order.OrderItems = orderDto.OrderItems.Select(oi =>
            {
                if (!warehouseItems.TryGetValue(oi.WarehouseItemId, out var unitPrice))
                    throw new InvalidOperationException($"Produkt o ID {oi.WarehouseItemId} nie istnieje lub jest usunięty.");

                return new OrderItem
                {
                    WarehouseItemId = oi.WarehouseItemId,
                    Quantity = oi.Quantity,
                    UnitPrice = unitPrice,
                    VatRate = oi.VatRate,
                    TotalPrice = oi.Quantity * unitPrice * (1 + oi.VatRate)
                };
            }).ToList();

            order.TotalAmount = order.OrderItems.Sum(oi => oi.TotalPrice);

            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Updated",
                ModifiedBy = orderDto.CreatedBy ?? "System",
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
            if (order == null)
                return NotFound();

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

        [HttpPost("restore/{id}")]
        public async Task<IActionResult> RestoreOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
                return NotFound();

            order.IsDeleted = false;
            var history = new OrderHistory
            {
                OrderId = order.Id,
                Action = "Restored",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Order {order.OrderNumber} restored."
            };
            _context.OrderHistory.Add(history);

            await _context.SaveChangesAsync();
            _cache.Remove("Orders");
            _cache.Remove($"Order_{id}");

            return NoContent();
        }

        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<OrderHistoryDto>>> GetOrderHistory(int id)
        {
            var history = await _context.OrderHistory
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

            return Ok(history);
        }

        [HttpGet("generate-order-number")]
        public async Task<ActionResult<object>> GenerateOrderNumber([FromQuery] string orderType)
        {
            var prefix = orderType == "Purchase" ? "PUR" : "SAL";
            var date = DateTime.Now.ToString("yyyyMMdd");
            var count = await _context.Orders
                .CountAsync(o => o.OrderNumber.StartsWith($"{prefix}-{date}")) + 1;
            var orderNumber = $"{prefix}-{date}-{count:D4}";
            return new { orderNumber };
        }
    }

    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; }
        public int TotalItems { get; set; }
    }
}