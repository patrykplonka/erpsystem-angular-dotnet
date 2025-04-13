using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;
using erpsystem.Server.Data;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarehouseItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WarehouseItemsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarehouseItemDto>>> GetWarehouseItems()
        {
            var items = await _context.WarehouseItems
                .Where(wi => !wi.IsDeleted)
                .Select(wi => new WarehouseItemDto
                {
                    Id = wi.Id,
                    Name = wi.Name,
                    Code = wi.Code,
                    Quantity = wi.Quantity,
                    UnitPrice = wi.Price, 
                    Category = wi.Category,
                    Location = wi.Location,
                    Warehouse = wi.Warehouse,
                    UnitOfMeasure = wi.UnitOfMeasure,
                    MinimumStock = wi.MinimumStock,
                    ContractorId = wi.ContractorId,
                    ContractorName = wi.Contractor != null ? wi.Contractor.Name : null,
                    BatchNumber = wi.BatchNumber,
                    ExpirationDate = wi.ExpirationDate,
                    PurchaseCost = wi.PurchaseCost,
                    VatRate = wi.VatRate,
                    IsDeleted = wi.IsDeleted
                })
                .ToListAsync();

            Console.WriteLine($"Returning {items.Count} warehouse items: {string.Join(", ", items.Select(i => $"{{Id: {i.Id}, Name: {i.Name}, UnitPrice: {i.UnitPrice}}}"))}");
            return Ok(items);
        }
    }
}