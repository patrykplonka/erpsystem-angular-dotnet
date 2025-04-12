using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System.Linq;
using System.Threading.Tasks;
using erpsystem.Server.Data;
using erpsystem.Server.Models.DTOs.erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OrdersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Contractor)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .Where(o => !o.IsDeleted)
                .ToListAsync();

            var orderDtos = orders.Select(o => new OrderDto
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

            return Ok(orderDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDto>> GetOrder(int id)
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

            var orderDto = new OrderDto
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

            return Ok(orderDto);
        }

        [HttpPost]
        public async Task<ActionResult<OrderDto>> CreateOrder(OrderDto orderDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var order = new Order
            {
                OrderNumber = orderDto.OrderNumber,
                ContractorId = orderDto.ContractorId,
                OrderType = orderDto.OrderType,
                OrderDate = orderDto.OrderDate,
                Status = orderDto.Status,
                CreatedBy = orderDto.CreatedBy,
                OrderItems = orderDto.OrderItems.Select(oi => new OrderItem
                {
                    WarehouseItemId = oi.WarehouseItemId,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    VatRate = oi.VatRate,
                    TotalPrice = oi.Quantity * oi.UnitPrice * (1 + oi.VatRate)
                }).ToList()
            };

            order.TotalAmount = order.OrderItems.Sum(oi => oi.TotalPrice);

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

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

            order.OrderNumber = orderDto.OrderNumber;
            order.ContractorId = orderDto.ContractorId;
            order.OrderType = orderDto.OrderType;
            order.OrderDate = orderDto.OrderDate;
            order.Status = orderDto.Status;

            _context.OrderItems.RemoveRange(order.OrderItems);
            order.OrderItems = orderDto.OrderItems.Select(oi => new OrderItem
            {
                OrderId = order.Id,
                WarehouseItemId = oi.WarehouseItemId,
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                VatRate = oi.VatRate,
                TotalPrice = oi.Quantity * oi.UnitPrice * (1 + oi.VatRate)
            }).ToList();

            order.TotalAmount = order.OrderItems.Sum(oi => oi.TotalPrice);

            await _context.SaveChangesAsync();

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
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("generate-order-number")]
        public async Task<IActionResult> GenerateOrderNumber([FromQuery] string orderType)
        {
            if (orderType != "Purchase" && orderType != "Sale")
            {
                return BadRequest(new { message = "Nieprawidłowy typ zamówienia." });
            }

            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var prefix = orderType == "Purchase" ? "PO" : "SO";
            var pattern = $"{prefix}-{today}-%";

            var count = await _context.Orders
                .Where(o => o.OrderNumber.StartsWith($"{prefix}-{today}-") && !o.IsDeleted)
                .CountAsync();

            var sequence = (count + 1).ToString("D3");
            var orderNumber = $"{prefix}-{today}-{sequence}";

            return Ok(new { orderNumber });
        }

        [HttpPost("{id}/confirm")]
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

                if (order.OrderType == "Purchase")
                {
                    item.WarehouseItem.Quantity += item.Quantity;
                }
                else if (order.OrderType == "Sale")
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
            await _context.SaveChangesAsync();

            return Ok(new { message = "Zamówienie zostało potwierdzone." });
        }
    }
}