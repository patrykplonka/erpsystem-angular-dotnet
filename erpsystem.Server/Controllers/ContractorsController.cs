using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using erpsystem.Server.Data;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;
using System.Threading.Tasks;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContractorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public ContractorsController(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContractorDTO>>> GetContractors()
        {
            const string cacheKey = "Contractors";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<ContractorDTO> contractorDtos))
            {
                var contractors = await _context.Contractors
                    .Where(c => !c.IsDeleted && (c.Type == "Supplier" || c.Type == "Both"))
                    .ToListAsync();

                contractorDtos = contractors.Select(c => new ContractorDTO
                {
                    Id = c.Id,
                    Name = c.Name,
                    Type = c.Type,
                    Email = c.Email,
                    Phone = c.Phone,
                    Address = c.Address,
                    TaxId = c.TaxId,
                    IsDeleted = c.IsDeleted
                }).ToList();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, contractorDtos, cacheOptions);
            }

            return Ok(contractorDtos);
        }
    }
}