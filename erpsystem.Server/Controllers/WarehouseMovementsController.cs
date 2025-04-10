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
            Console.WriteLine($"Received movementDto: {System.Text.Json.JsonSerializer.Serialize(movementDto)}");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var item = await _context.WarehouseItems.FindAsync(movementDto.WarehouseItemId);
            if (item == null || item.IsDeleted)
                return NotFound("Produkt nie istnieje lub jest usunięty");

            if (!Enum.TryParse<WarehouseMovementType>(movementDto.MovementType, out var movementType))
                return BadRequest("Nieprawidłowy typ ruchu");

            switch (movementType)
            {
                case WarehouseMovementType.PZ: // Przyjęcie Zewnętrzne
                case WarehouseMovementType.PW: // Przyjęcie Wewnętrzne
                case WarehouseMovementType.ZW: // Zwrot Wewnętrzny
                case WarehouseMovementType.ZK: // Zwrot Konsygnacyjny
                    item.Quantity += movementDto.Quantity;
                    break;

                case WarehouseMovementType.WZ: // Wydanie Zewnętrzne
                case WarehouseMovementType.RW: // Rozchód Wewnętrzny
                    if (item.Quantity < movementDto.Quantity)
                        return BadRequest("Niewystarczająca ilość na magazynie");
                    item.Quantity -= movementDto.Quantity;
                    break;

                case WarehouseMovementType.MM: // Przesunięcie Międzymagazynowe
                    // Tutaj można dodać logikę dla przesunięć, np. wymaga pola TargetWarehouseId
                    if (item.Quantity < movementDto.Quantity)
                        return BadRequest("Niewystarczająca ilość na magazynie do przesunięcia");
                    item.Quantity -= movementDto.Quantity; // Zmniejsz w źródłowym magazynie
                    // Dodaj logikę zwiększenia w docelowym magazynie, jeśli masz TargetWarehouseId
                    break;

                case WarehouseMovementType.INW: // Inwentaryzacja
                    item.Quantity = movementDto.Quantity; // Ustaw nową wartość stanu
                    break;

                default:
                    return BadRequest("Nieobsługiwany typ ruchu");
            }

            var movement = new WarehouseMovements
            {
                WarehouseItemId = movementDto.WarehouseItemId,
                MovementType = movementType,
                Quantity = movementDto.Quantity,
                Supplier = movementDto.Supplier ?? string.Empty,
                DocumentNumber = movementDto.DocumentNumber ?? string.Empty,
                Date = movementDto.Date,
                Description = movementDto.Description ?? string.Empty,
                CreatedBy = string.IsNullOrEmpty(movementDto.CreatedBy) ? "Unknown" : movementDto.CreatedBy,
                Status = movementDto.Status ?? "Planned",
                Comment = movementDto.Comment ?? string.Empty
            };

            _context.WarehouseMovements.Add(movement);
            _context.WarehouseItems.Update(item);
            await _context.SaveChangesAsync();

            var responseDto = new WarehouseMovementsDTO
            {
                Id = movement.Id,
                WarehouseItemId = movement.WarehouseItemId,
                MovementType = movement.MovementType.ToString(),
                Quantity = movement.Quantity,
                Supplier = movement.Supplier,
                DocumentNumber = movement.DocumentNumber,
                Date = movement.Date,
                Description = movement.Description,
                CreatedBy = movement.CreatedBy,
                Status = movement.Status,
                Comment = movement.Comment
            };

            Console.WriteLine($"Saved movement: {System.Text.Json.JsonSerializer.Serialize(responseDto)}");
            return Ok(responseDto);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMovements()
        {
            var movements = await _context.WarehouseMovements
                .OrderByDescending(m => m.Date)
                .Select(m => new WarehouseMovementsDTO
                {
                    Id = m.Id,
                    WarehouseItemId = m.WarehouseItemId,
                    MovementType = m.MovementType.ToString(),
                    Quantity = m.Quantity,
                    Supplier = m.Supplier,
                    DocumentNumber = m.DocumentNumber,
                    Date = m.Date,
                    Description = m.Description,
                    CreatedBy = m.CreatedBy,
                    Status = m.Status,
                    Comment = m.Comment
                })
                .ToListAsync();

            Console.WriteLine($"Returning all movements: {System.Text.Json.JsonSerializer.Serialize(movements)}");
            return Ok(movements);
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
                    MovementType = m.MovementType.ToString(),
                    Quantity = m.Quantity,
                    Supplier = m.Supplier,
                    DocumentNumber = m.DocumentNumber,
                    Date = m.Date,
                    Description = m.Description,
                    CreatedBy = m.CreatedBy,
                    Status = m.Status,
                    Comment = m.Comment
                })
                .ToListAsync();

            Console.WriteLine($"Returning movements for item {warehouseItemId}: {System.Text.Json.JsonSerializer.Serialize(movements)}");
            return Ok(movements);
        }

        [HttpGet("period")]
        public async Task<IActionResult> GetMovementsInPeriod([FromQuery] string start, [FromQuery] string end)
        {
            if (string.IsNullOrEmpty(start) || string.IsNullOrEmpty(end))
                return BadRequest("Parametry 'start' i 'end' są wymagane.");

            if (!DateTime.TryParse(start, out DateTime startDate) || !DateTime.TryParse(end, out DateTime endDate))
                return BadRequest("Nieprawidłowy format daty. Oczekiwano formatu YYYY-MM-DD.");

            if (startDate > endDate)
                return BadRequest("Data początkowa nie może być późniejsza niż data końcowa.");

            var movements = await _context.WarehouseMovements
                .Where(m => m.Date >= startDate && m.Date <= endDate)
                .OrderBy(m => m.Date)
                .Select(m => new WarehouseMovementsDTO
                {
                    Id = m.Id,
                    WarehouseItemId = m.WarehouseItemId,
                    MovementType = m.MovementType.ToString(),
                    Quantity = m.Quantity,
                    Supplier = m.Supplier,
                    DocumentNumber = m.DocumentNumber,
                    Date = m.Date,
                    Description = m.Description,
                    CreatedBy = m.CreatedBy,
                    Status = m.Status,
                    Comment = m.Comment
                })
                .ToListAsync();

            Console.WriteLine($"Returning movements for period {start} to {end}: {System.Text.Json.JsonSerializer.Serialize(movements)}");
            return Ok(movements);
        }
    }
}