using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using erpsystem.Server.Data;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Globalization;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public PurchasesController(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseDto>>> GetPurchases(bool showDeleted = false)
        {
            const string cacheKey = "Purchases";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<PurchaseDto> purchaseDtos))
            {
                var purchases = await _context.Purchases
                    .Include(p => p.Contractor)
                    .Include(p => p.PurchaseItems)
                    .ThenInclude(pi => pi.WarehouseItem)
                    .Where(p => showDeleted || !p.IsDeleted)
                    .ToListAsync();

                purchaseDtos = purchases.Select(p => new PurchaseDto
                {
                    Id = p.Id,
                    PurchaseNumber = p.PurchaseNumber,
                    ContractorId = p.ContractorId,
                    ContractorName = p.Contractor != null ? p.Contractor.Name : "Brak kontrahenta",
                    OrderDate = p.OrderDate,
                    TotalAmount = p.TotalAmount,
                    Status = p.Status,
                    CreatedBy = p.CreatedBy,
                    CreatedDate = p.CreatedDate,
                    IsDeleted = p.IsDeleted,
                    PurchaseItems = p.PurchaseItems.Select(pi => new PurchaseItemDto
                    {
                        Id = pi.Id,
                        PurchaseId = pi.PurchaseId,
                        WarehouseItemId = pi.WarehouseItemId,
                        WarehouseItemName = pi.WarehouseItem != null ? pi.WarehouseItem.Name : "Brak produktu",
                        Quantity = pi.Quantity,
                        UnitPrice = pi.UnitPrice,
                        VatRate = pi.VatRate,
                        TotalPrice = pi.TotalPrice
                    }).ToList()
                }).ToList();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, purchaseDtos, cacheOptions);
            }

            return Ok(purchaseDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseDto>> GetPurchase(int id)
        {
            var cacheKey = $"Purchase_{id}";
            if (!_cache.TryGetValue(cacheKey, out PurchaseDto purchaseDto))
            {
                var purchase = await _context.Purchases
                    .Include(p => p.Contractor)
                    .Include(p => p.PurchaseItems)
                    .ThenInclude(pi => pi.WarehouseItem)
                    .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

                if (purchase == null)
                {
                    return NotFound();
                }

                purchaseDto = new PurchaseDto
                {
                    Id = purchase.Id,
                    PurchaseNumber = purchase.PurchaseNumber,
                    ContractorId = purchase.ContractorId,
                    ContractorName = purchase.Contractor != null ? purchase.Contractor.Name : "Brak kontrahenta",
                    OrderDate = purchase.OrderDate,
                    TotalAmount = purchase.TotalAmount,
                    Status = purchase.Status,
                    CreatedBy = purchase.CreatedBy,
                    CreatedDate = purchase.CreatedDate,
                    IsDeleted = purchase.IsDeleted,
                    PurchaseItems = purchase.PurchaseItems.Select(pi => new PurchaseItemDto
                    {
                        Id = pi.Id,
                        PurchaseId = pi.PurchaseId,
                        WarehouseItemId = pi.WarehouseItemId,
                        WarehouseItemName = pi.WarehouseItem != null ? pi.WarehouseItem.Name : "Brak produktu",
                        Quantity = pi.Quantity,
                        UnitPrice = pi.UnitPrice,
                        VatRate = pi.VatRate,
                        TotalPrice = pi.TotalPrice
                    }).ToList()
                };

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, purchaseDto, cacheOptions);
            }

            return Ok(purchaseDto);
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseDto>> CreatePurchase(PurchaseDto purchaseDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var contractor = await _context.Contractors
                .Where(c => c.Id == purchaseDto.ContractorId && !c.IsDeleted)
                .FirstOrDefaultAsync();

            if (contractor == null || (contractor.Type != "Supplier" && contractor.Type != "Both"))
            {
                return BadRequest(new { message = "Wybrany kontrahent nie może być dostawcą." });
            }

            var warehouseItemIds = purchaseDto.PurchaseItems.Select(pi => pi.WarehouseItemId).Distinct().ToList();
            var warehouseItems = await _context.WarehouseItems
                .Where(wi => warehouseItemIds.Contains(wi.Id) && !wi.IsDeleted)
                .ToDictionaryAsync(wi => wi.Id, wi => wi.Price);

            if (!DateTime.TryParseExact(purchaseDto.OrderDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var orderDate))
            {
                return BadRequest(new { message = "Nieprawidłowy format daty zamówienia. Oczekiwano: YYYY-MM-DD." });
            }

            if (!DateTime.TryParseExact(purchaseDto.CreatedDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var createdDate))
            {
                return BadRequest(new { message = "Nieprawidłowy format daty utworzenia. Oczekiwano: YYYY-MM-DD." });
            }

            var purchase = new erpsystem.Server.Models.Purchase
            {
                PurchaseNumber = purchaseDto.PurchaseNumber,
                ContractorId = purchaseDto.ContractorId,
                OrderDate = purchaseDto.OrderDate,
                Status = purchaseDto.Status,
                CreatedBy = purchaseDto.CreatedBy,
                CreatedDate = purchaseDto.CreatedDate,
                PurchaseItems = purchaseDto.PurchaseItems.Select(pi =>
                {
                    if (!warehouseItems.TryGetValue(pi.WarehouseItemId, out var unitPrice))
                    {
                        throw new InvalidOperationException($"Produkt o ID {pi.WarehouseItemId} nie istnieje lub jest usunięty.");
                    }

                    return new PurchaseItem
                    {
                        WarehouseItemId = pi.WarehouseItemId,
                        Quantity = pi.Quantity,
                        UnitPrice = unitPrice,
                        VatRate = pi.VatRate,
                        TotalPrice = pi.Quantity * unitPrice * (1 + pi.VatRate / 100)
                    };
                }).ToList()
            };

            purchase.TotalAmount = purchase.PurchaseItems.Sum(pi => pi.TotalPrice);

            _context.Purchases.Add(purchase);
            await _context.SaveChangesAsync();

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Created",
                ModifiedBy = purchaseDto.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} created."
            };
            _context.PurchaseHistory.Add(history);
            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");

            purchaseDto.Id = purchase.Id;
            purchaseDto.TotalAmount = purchase.TotalAmount;
            purchaseDto.PurchaseItems.ForEach(pi => pi.PurchaseId = purchase.Id);

            return CreatedAtAction(nameof(GetPurchase), new { id = purchase.Id }, purchaseDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePurchase(int id, PurchaseDto purchaseDto)
        {
            if (id != purchaseDto.Id)
            {
                return BadRequest();
            }

            var contractor = await _context.Contractors
                .Where(c => c.Id == purchaseDto.ContractorId && !c.IsDeleted)
                .FirstOrDefaultAsync();

            if (contractor == null || (contractor.Type != "Supplier" && contractor.Type != "Both"))
            {
                return BadRequest(new { message = "Wybrany kontrahent nie może być dostawcą." });
            }

            var purchase = await _context.Purchases
                .Include(p => p.PurchaseItems)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

            if (purchase == null)
            {
                return NotFound();
            }

            var warehouseItemIds = purchaseDto.PurchaseItems.Select(pi => pi.WarehouseItemId).Distinct().ToList();
            var warehouseItems = await _context.WarehouseItems
                .Where(wi => warehouseItemIds.Contains(wi.Id) && !wi.IsDeleted)
                .ToDictionaryAsync(wi => wi.Id, wi => wi.Price);

            if (!DateTime.TryParseExact(purchaseDto.OrderDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var orderDate))
            {
                return BadRequest(new { message = "Nieprawidłowy format daty zamówienia. Oczekiwano: YYYY-MM-DD." });
            }

            if (!DateTime.TryParseExact(purchaseDto.CreatedDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var createdDate))
            {
                return BadRequest(new { message = "Nieprawidłowy format daty utworzenia. Oczekiwano: YYYY-MM-DD." });
            }

            purchase.PurchaseNumber = purchaseDto.PurchaseNumber;
            purchase.ContractorId = purchaseDto.ContractorId;
            purchase.OrderDate = purchaseDto.OrderDate;
            purchase.Status = purchaseDto.Status;
            purchase.CreatedDate = purchaseDto.CreatedDate;

            _context.PurchaseItems.RemoveRange(purchase.PurchaseItems);
            purchase.PurchaseItems = purchaseDto.PurchaseItems.Select(pi =>
            {
                if (!warehouseItems.TryGetValue(pi.WarehouseItemId, out var unitPrice))
                {
                    throw new InvalidOperationException($"Produkt o ID {pi.WarehouseItemId} nie istnieje lub jest usunięty.");
                }

                return new PurchaseItem
                {
                    PurchaseId = purchase.Id,
                    WarehouseItemId = pi.WarehouseItemId,
                    Quantity = pi.Quantity,
                    UnitPrice = unitPrice,
                    VatRate = pi.VatRate,
                    TotalPrice = pi.Quantity * unitPrice * (1 + pi.VatRate / 100)
                };
            }).ToList();

            purchase.TotalAmount = purchase.PurchaseItems.Sum(pi => pi.TotalPrice);

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Updated",
                ModifiedBy = purchaseDto.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} updated."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePurchase(int id)
        {
            var purchase = await _context.Purchases.FindAsync(id);
            if (purchase == null || purchase.IsDeleted)
            {
                return NotFound();
            }

            purchase.IsDeleted = true;

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Deleted",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} marked as deleted."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestorePurchase(int id)
        {
            var purchase = await _context.Purchases.FindAsync(id);
            if (purchase == null)
            {
                return NotFound();
            }

            purchase.IsDeleted = false;

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Restored",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} restored."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpGet("generate-purchase-number")]
        public async Task<IActionResult> GeneratePurchaseNumber()
        {
            var cacheKey = $"PurchaseNumber_{DateTime.UtcNow:yyyyMMdd}";
            if (!_cache.TryGetValue(cacheKey, out string purchaseNumber))
            {
                var today = DateTime.UtcNow.ToString("yyyyMM-dd", CultureInfo.InvariantCulture);
                var prefix = "PO";
                var pattern = $"{prefix}-{today}-%";

                var count = await _context.Purchases
                    .Where(p => p.PurchaseNumber.StartsWith($"{prefix}-{today}-") && !p.IsDeleted)
                    .CountAsync();

                var sequence = (count + 1).ToString("D3");
                purchaseNumber = $"{prefix}-{today}-{sequence}";

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, purchaseNumber, cacheOptions);
            }

            return Ok(new { purchaseNumber });
        }

        [HttpPost("confirm/{id}")]
        public async Task<IActionResult> ConfirmPurchase(int id)
        {
            var purchase = await _context.Purchases
                .Include(p => p.Contractor)
                .Include(p => p.PurchaseItems)
                .ThenInclude(pi => pi.WarehouseItem)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

            if (purchase == null)
            {
                return NotFound(new { message = $"Zamówienie zakupu o ID {id} nie istnieje." });
            }

            if (purchase.Status != "Draft")
            {
                return BadRequest(new { message = "Tylko zamówienia w statusie Draft mogą być potwierdzone." });
            }

            if (purchase.Contractor == null)
            {
                return BadRequest(new { message = $"Kontrahent dla zamówienia o ID {id} nie istnieje. Sprawdź ContractorId." });
            }

            foreach (var item in purchase.PurchaseItems)
            {
                if (item.WarehouseItem == null)
                {
                    return BadRequest(new { message = $"Produkt o ID {item.WarehouseItemId} nie istnieje." });
                }

                var movement = new WarehouseMovements
                {
                    WarehouseItemId = item.WarehouseItemId,
                    MovementType = WarehouseMovementType.PZ,
                    Quantity = item.Quantity,
                    Supplier = purchase.Contractor.Name,
                    DocumentNumber = purchase.PurchaseNumber,
                    Date = DateTime.UtcNow,
                    Description = $"Zamówienie zakupu - {purchase.PurchaseNumber}",
                    CreatedBy = purchase.CreatedBy,
                    Status = "Completed"
                };
                _context.WarehouseMovements.Add(movement);
            }

            purchase.Status = "Confirmed";

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Confirmed",
                ModifiedBy = purchase.CreatedBy,
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} confirmed."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpPost("receive/{id}")]
        public async Task<IActionResult> ReceivePurchase(int id)
        {
            var purchase = await _context.Purchases
                .Include(p => p.PurchaseItems)
                .ThenInclude(pi => pi.WarehouseItem)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

            if (purchase == null)
            {
                return NotFound(new { message = $"Zamówienie zakupu o ID {id} nie istnieje." });
            }

            if (purchase.Status != "Confirmed")
            {
                return BadRequest(new { message = "Tylko zamówienia w statusie Confirmed mogą być przyjęte." });
            }

            foreach (var item in purchase.PurchaseItems)
            {
                if (item.WarehouseItem == null)
                {
                    return BadRequest(new { message = $"Produkt o ID {item.WarehouseItemId} nie istnieje." });
                }

                item.WarehouseItem.Quantity += item.Quantity;
            }

            purchase.Status = "Received";

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Received",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} received."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto statusDto)
        {
            var purchase = await _context.Purchases
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

            if (purchase == null)
            {
                return NotFound();
            }

            purchase.Status = statusDto.Status;

            var history = new PurchaseHistory
            {
                PurchaseId = purchase.Id,
                Action = "Status Updated",
                ModifiedBy = "System",
                ModifiedDate = DateTime.UtcNow,
                Details = $"Purchase {purchase.PurchaseNumber} status changed to {statusDto.Status}."
            };
            _context.PurchaseHistory.Add(history);

            await _context.SaveChangesAsync();

            _cache.Remove("Purchases");
            _cache.Remove($"Purchase_{id}");

            return NoContent();
        }

        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<PurchaseHistoryDto>>> GetPurchaseHistory(int id)
        {
            var cacheKey = $"PurchaseHistory_{id}";
            if (!_cache.TryGetValue(cacheKey, out IEnumerable<PurchaseHistoryDto> historyDtos))
            {
                var history = await _context.PurchaseHistory
                    .Where(ph => ph.PurchaseId == id)
                    .OrderByDescending(ph => ph.ModifiedDate)
                    .ToListAsync();

                historyDtos = history.Select(ph => new PurchaseHistoryDto
                {
                    Id = ph.Id,
                    PurchaseId = ph.PurchaseId,
                    Action = ph.Action,
                    ModifiedBy = ph.ModifiedBy,
                    ModifiedDate = ph.ModifiedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Details = ph.Details
                }).ToList();

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };
                _cache.Set(cacheKey, historyDtos, cacheOptions);
            }

            return Ok(historyDtos);
        }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; }
    }
}