using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;
using erpsystem.Server.Data;
using Microsoft.Extensions.Caching.Memory;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarehouseItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public WarehouseItemsController(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarehouseItemDto>>> GetWarehouseItems()
        {
            const string cacheKey = "WarehouseItemsAll";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<WarehouseItemDto>? items))
            {
                items = await _context.WarehouseItems
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
                        ContractorName = wi.Contractor != null ? wi.Contractor.Name : string.Empty,
                        BatchNumber = wi.BatchNumber,
                        ExpirationDate = wi.ExpirationDate,
                        PurchaseCost = wi.PurchaseCost,
                        VatRate = wi.VatRate,
                        IsDeleted = wi.IsDeleted
                    })
                    .ToListAsync();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, items, cacheOptions);
            }

            items ??= Enumerable.Empty<WarehouseItemDto>();
            Console.WriteLine($"Returning {items.Count()} warehouse items: {string.Join(", ", items.Select(i => $"{{Id: {i.Id}, Name: {i.Name}, UnitPrice: {i.UnitPrice}}}"))}");
            return Ok(items);
        }
    }
}