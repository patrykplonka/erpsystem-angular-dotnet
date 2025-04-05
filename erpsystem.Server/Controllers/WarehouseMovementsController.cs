using erpsystem.Server.Data;
using erpsystem.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarehouseMovementsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WarehouseMovementsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateMovement([FromBody] WarehouseMovements movement)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var item = await _context.WarehouseItems.FindAsync(movement.WarehouseItemId);
            if (item == null || item.IsDeleted)
                return NotFound("Produkt nie istnieje lub jest usunięty");

            if (movement.MovementType == "Receipt")
            {
                item.Quantity += movement.Quantity;
            }
            else if (movement.MovementType == "Issue")
            {
                if (item.Quantity < movement.Quantity)
                    return BadRequest("Niewystarczająca ilość na magazynie");
                item.Quantity -= movement.Quantity;
            }
            else
            {
                return BadRequest("Nieprawidłowy typ ruchu");
            }

            movement.CreatedBy = User.Identity?.Name ?? "System"; 
            _context.WarehouseMovements.Add(movement);
            await _context.SaveChangesAsync();
            return Ok(movement);
        }

        [HttpGet("item/{warehouseItemId}")]
        public async Task<IActionResult> GetMovementsByItem(int warehouseItemId)
        {
            var movements = await _context.WarehouseMovements
                .Where(m => m.WarehouseItemId == warehouseItemId)
                .OrderByDescending(m => m.Date)
                .ToListAsync();
            return Ok(movements);
        }
    }
}