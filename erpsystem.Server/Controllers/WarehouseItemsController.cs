using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
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
                .Include(wi => wi.Contractor)
                .Select(wi => new WarehouseItemDto
                {
                    Id = wi.Id,
                    Name = wi.Name,
                    Code = wi.Code,
                    Quantity = wi.Quantity,
                    Price = wi.Price,
                    Category = wi.Category,
                    Location = wi.Location,
                    Warehouse = wi.Warehouse,
                    UnitOfMeasure = wi.UnitOfMeasure,
                    MinimumStock = wi.MinimumStock,
                    ContractorId = wi.ContractorId,
                    ContractorName = wi.Contractor != null ? wi.Contractor.Name : "",
                    BatchNumber = wi.BatchNumber,
                    ExpirationDate = wi.ExpirationDate,
                    PurchaseCost = wi.PurchaseCost,
                    VatRate = wi.VatRate,
                    IsDeleted = wi.IsDeleted
                })
                .ToListAsync();

            return Ok(items);
        }
    }
}