using erpsystem.Server.Data;
using erpsystem.Server.Models.DTOs;
using erpsystem.Server.Models;
using Microsoft.AspNetCore.Mvc;
using erpsystem.Server.Models;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarehouseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WarehouseController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarehouseItemDto>>> GetItems()
        {
            var items = await _context.WarehouseItems.ToListAsync();

            // Ręczne mapowanie listy WarehouseItem na WarehouseItemDto
            var itemDtos = items.Select(item => new WarehouseItemDto
            {
                Id = item.Id,
                Name = item.Name,
                Code = item.Code,
                Quantity = item.Quantity,
                Price = item.Price,
                Category = item.Category
            }).ToList();

            return Ok(itemDtos);
        }

        [HttpPost]
        public async Task<ActionResult<WarehouseItemDto>> AddItem([FromBody] CreateWarehouseItemDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Ręczne mapowanie CreateWarehouseItemDto na WarehouseItem
            var item = new WarehouseItem
            {
                Name = createDto.Name,
                Code = createDto.Code,
                Quantity = createDto.Quantity,
                Price = createDto.Price,
                Category = createDto.Category,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = User?.Identity?.Name ?? "System" // Przykład, wymaga autoryzacji
            };

            _context.WarehouseItems.Add(item);
            await _context.SaveChangesAsync();

            // Ręczne mapowanie WarehouseItem na WarehouseItemDto dla odpowiedzi
            var resultDto = new WarehouseItemDto
            {
                Id = item.Id,
                Name = item.Name,
                Code = item.Code,
                Quantity = item.Quantity,
                Price = item.Price,
                Category = item.Category
            };

            return CreatedAtAction(nameof(GetItems), new { id = item.Id }, resultDto);
        }
    }
}
