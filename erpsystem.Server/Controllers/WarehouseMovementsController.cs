using erpsystem.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models.DTOs;

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
        public async Task<IActionResult> CreateMovement([FromBody] WarehouseMovementsDTO movementDto)
        {
            // Logowanie otrzymanych danych dla debugowania
            Console.WriteLine($"Received movementDto: {System.Text.Json.JsonSerializer.Serialize(movementDto)}");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var item = await _context.WarehouseItems.FindAsync(movementDto.WarehouseItemId);
            if (item == null || item.IsDeleted)
                return NotFound("Produkt nie istnieje lub jest usunięty");

            if (movementDto.MovementType == "Receipt")
            {
                item.Quantity += movementDto.Quantity;
            }
            else if (movementDto.MovementType == "Issue")
            {
                if (item.Quantity < movementDto.Quantity)
                    return BadRequest("Niewystarczająca ilość na magazynie");
                item.Quantity -= movementDto.Quantity;
            }
            else
            {
                return BadRequest("Nieprawidłowy typ ruchu");
            }

            var movement = new WarehouseMovements
            {
                WarehouseItemId = movementDto.WarehouseItemId,
                MovementType = movementDto.MovementType,
                Quantity = movementDto.Quantity,
                Date = DateTime.UtcNow,
                Description = movementDto.Description,
                CreatedBy = movementDto.CreatedBy // Zachowaj wartość przesłaną z frontendu
            };

            // Jeśli CreatedBy jest null lub pusty, ustaw "Unknown" zamiast "System"
            if (string.IsNullOrEmpty(movement.CreatedBy))
            {
                movement.CreatedBy = "Unknown"; // Domyślna wartość, jeśli brak danych
            }

            _context.WarehouseMovements.Add(movement);
            await _context.SaveChangesAsync();

            var responseDto = new WarehouseMovementsDTO
            {
                Id = movement.Id,
                WarehouseItemId = movement.WarehouseItemId,
                MovementType = movement.MovementType,
                Quantity = movement.Quantity,
                Date = movement.Date,
                Description = movement.Description,
                CreatedBy = movement.CreatedBy
            };

            // Logowanie zapisanego ruchu
            Console.WriteLine($"Saved movement: {System.Text.Json.JsonSerializer.Serialize(responseDto)}");

            return Ok(responseDto);
        }

        [HttpGet("item/{warehouseItemId}")]
        public async Task<IActionResult> GetMovementsByItem(int warehouseItemId)
        {
            var movements = await _context.WarehouseMovements
                .Where(m => m.WarehouseItemId == warehouseItemId)
                .OrderByDescending(m => m.Date)
                .Select(m => new WarehouseMovementsDTO
                {
                    Id = m.Id,
                    WarehouseItemId = m.WarehouseItemId,
                    MovementType = m.MovementType,
                    Quantity = m.Quantity,
                    Date = m.Date,
                    Description = m.Description,
                    CreatedBy = m.CreatedBy
                })
                .ToListAsync();

            // Logowanie zwróconych danych
            Console.WriteLine($"Returning movements for item {warehouseItemId}: {System.Text.Json.JsonSerializer.Serialize(movements)}");

            return Ok(movements);
        }
    }
}