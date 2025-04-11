using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContractorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ContractorsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContractorDTO>>> GetContractors()
        {
            try
            {
                var contractors = await _context.Contractors
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
                return Ok(contractors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ContractorDTO>> GetContractor(int id)
        {
            try
            {
                var contractor = await _context.Contractors
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
                    return NotFound("Kontrahent nie znaleziony.");
                }
                return Ok(contractor);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
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
                    return BadRequest("Nazwa, typ, email i NIP są wymagane.");
                }

                if (!new[] { "Supplier", "Client", "Both" }.Contains(dto.Type))
                {
                    return BadRequest("Typ musi być: Supplier, Client lub Both.");
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

                return CreatedAtAction(nameof(GetContractor), new { id = contractor.Id }, responseDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutContractor(int id, UpdateContractorDto dto)
        {
            try
            {
                if (id != dto.Id)
                {
                    return BadRequest("ID w ścieżce i DTO nie zgadzają się.");
                }

                if (string.IsNullOrEmpty(dto.Name) || string.IsNullOrEmpty(dto.Type) ||
                    string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.TaxId))
                {
                    return BadRequest("Nazwa, typ, email i NIP są wymagane.");
                }

                if (!new[] { "Supplier", "Client", "Both" }.Contains(dto.Type))
                {
                    return BadRequest("Typ musi być: Supplier, Client lub Both.");
                }

                var contractor = await _context.Contractors.FindAsync(id);
                if (contractor == null)
                {
                    return NotFound("Kontrahent nie znaleziony.");
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
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Contractors.Any(e => e.Id == id))
                {
                    return NotFound("Kontrahent nie znaleziony.");
                }
                throw;
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
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
                    return NotFound("Kontrahent nie znaleziony.");
                }

                contractor.IsDeleted = true;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
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
                    return NotFound("Kontrahent nie znaleziony.");
                }

                contractor.IsDeleted = false;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Błąd serwera: {ex.Message}");
            }
        }
    }
}