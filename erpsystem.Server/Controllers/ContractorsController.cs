using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
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
        private readonly ILogger<ContractorsController> _logger;

        public ContractorsController(ApplicationDbContext context, IMemoryCache cache, ILogger<ContractorsController> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContractorDTO>>> GetContractors()
        {
            try
            {
                const string cacheKey = "Contractors";
                if (!_cache.TryGetValue(cacheKey, out IEnumerable<ContractorDTO> contractors))
                {
                    _logger.LogInformation("Fetching contractors from database.");
                    contractors = await _context.Contractors
                        .Where(c => !c.IsDeleted && (c.Type == "Supplier" || c.Type == "Both"))
                        .Select(c => new ContractorDTO
                        {
                            Id = c.Id,
                            Name = c.Name,
                            Type = c.Type,
                            Email = c.Email,
                            Phone = c.Phone,
                            Address = c.Address,
                            TaxId = c.TaxId,
                            IsDeleted = c.IsDeleted
                        })
                        .ToListAsync();

                    _logger.LogInformation("Fetched {Count} contractors.", contractors.Count());

                    var cacheOptions = new MemoryCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                    };
                    _cache.Set(cacheKey, contractors, cacheOptions);
                }

                return Ok(contractors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching contractors.");
                return StatusCode(500, new { message = "Błąd serwera podczas pobierania kontrahentów.", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ContractorDTO>> GetContractor(int id)
        {
            try
            {
                var cacheKey = $"Contractor_{id}";
                if (!_cache.TryGetValue(cacheKey, out ContractorDTO contractor))
                {
                    _logger.LogInformation("Fetching contractor with ID {Id} from database.", id);
                    contractor = await _context.Contractors
                        .Where(c => c.Id == id)
                        .Select(c => new ContractorDTO
                        {
                            Id = c.Id,
                            Name = c.Name,
                            Type = c.Type,
                            Email = c.Email,
                            Phone = c.Phone,
                            Address = c.Address,
                            TaxId = c.TaxId,
                            IsDeleted = c.IsDeleted
                        })
                        .FirstOrDefaultAsync();

                    if (contractor == null)
                    {
                        _logger.LogWarning("Contractor with ID {Id} not found.", id);
                        return NotFound(new { message = "Kontrahent nie znaleziony." });
                    }

                    var cacheOptions = new MemoryCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                    };
                    _cache.Set(cacheKey, contractor, cacheOptions);
                }

                return Ok(contractor);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching contractor with ID {Id}.", id);
                return StatusCode(500, new { message = "Błąd serwera podczas pobierania kontrahenta.", details = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ContractorDTO>> PostContractor(CreateContractorDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.Name) || string.IsNullOrEmpty(dto.Type) ||
                    string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.TaxId))
                {
                    return BadRequest(new { message = "Nazwa, typ, email i NIP są wymagane." });
                }

                if (!new[] { "Supplier", "Client", "Both" }.Contains(dto.Type))
                {
                    return BadRequest(new { message = "Typ musi być: Supplier, Client lub Both." });
                }

                var contractor = new Contractor
                {
                    Name = dto.Name,
                    Type = dto.Type,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Address = dto.Address,
                    TaxId = dto.TaxId,
                    IsDeleted = false
                };

                _context.Contractors.Add(contractor);
                await _context.SaveChangesAsync();

                _cache.Remove("Contractors");

                var responseDto = new ContractorDTO
                {
                    Id = contractor.Id,
                    Name = contractor.Name,
                    Type = contractor.Type,
                    Email = contractor.Email,
                    Phone = contractor.Phone,
                    Address = contractor.Address,
                    TaxId = contractor.TaxId,
                    IsDeleted = contractor.IsDeleted
                };

                _logger.LogInformation("Created contractor with ID {Id}.", contractor.Id);
                return CreatedAtAction(nameof(GetContractor), new { id = contractor.Id }, responseDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating contractor.");
                return StatusCode(500, new { message = "Błąd serwera podczas tworzenia kontrahenta.", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutContractor(int id, UpdateContractorDto dto)
        {
            try
            {
                if (id != dto.Id)
                {
                    return BadRequest(new { message = "ID w ścieżce i DTO nie zgadzają się." });
                }

                if (string.IsNullOrEmpty(dto.Name) || string.IsNullOrEmpty(dto.Type) ||
                    string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.TaxId))
                {
                    return BadRequest(new { message = "Nazwa, typ, email i NIP są wymagane." });
                }

                if (!new[] { "Supplier", "Client", "Both" }.Contains(dto.Type))
                {
                    return BadRequest(new { message = "Typ musi być: Supplier, Client lub Both." });
                }

                var contractor = await _context.Contractors.FindAsync(id);
                if (contractor == null)
                {
                    _logger.LogWarning("Contractor with ID {Id} not found for update.", id);
                    return NotFound(new { message = "Kontrahent nie znaleziony." });
                }

                contractor.Name = dto.Name;
                contractor.Type = dto.Type;
                contractor.Email = dto.Email;
                contractor.Phone = dto.Phone;
                contractor.Address = dto.Address;
                contractor.TaxId = dto.TaxId;
                contractor.IsDeleted = dto.IsDeleted;

                _context.Entry(contractor).State = EntityState.Modified;

                await _context.SaveChangesAsync();

                _cache.Remove("Contractors");
                _cache.Remove($"Contractor_{id}");

                _logger.LogInformation("Updated contractor with ID {Id}.", id);
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Contractors.Any(e => e.Id == id))
                {
                    _logger.LogWarning("Contractor with ID {Id} not found during concurrency check.", id);
                    return NotFound(new { message = "Kontrahent nie znaleziony." });
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating contractor with ID {Id}.", id);
                return StatusCode(500, new { message = "Błąd serwera podczas aktualizacji kontrahenta.", details = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteContractor(int id)
        {
            try
            {
                var contractor = await _context.Contractors.FindAsync(id);
                if (contractor == null)
                {
                    _logger.LogWarning("Contractor with ID {Id} not found for deletion.", id);
                    return NotFound(new { message = "Kontrahent nie znaleziony." });
                }

                contractor.IsDeleted = true;
                await _context.SaveChangesAsync();

                _cache.Remove("Contractors");
                _cache.Remove($"Contractor_{id}");

                _logger.LogInformation("Deleted contractor with ID {Id}.", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting contractor with ID {Id}.", id);
                return StatusCode(500, new { message = "Błąd serwera podczas usuwania kontrahenta.", details = ex.Message });
            }
        }

        [HttpPost("restore/{id}")]
        public async Task<IActionResult> RestoreContractor(int id)
        {
            try
            {
                var contractor = await _context.Contractors.FindAsync(id);
                if (contractor == null)
                {
                    _logger.LogWarning("Contractor with ID {Id} not found for restoration.", id);
                    return NotFound(new { message = "Kontrahent nie znaleziony." });
                }

                contractor.IsDeleted = false;
                await _context.SaveChangesAsync();

                _cache.Remove("Contractors");
                _cache.Remove($"Contractor_{id}");

                _logger.LogInformation("Restored contractor with ID {Id}.", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring contractor with ID {Id}.", id);
                return StatusCode(500, new { message = "Błąd serwera podczas przywracania kontrahenta.", details = ex.Message });
            }
        }
    }
}