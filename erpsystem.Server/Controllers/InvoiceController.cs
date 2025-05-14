using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using iText.Kernel.Pdf;
using iText.IO.Image;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Layout.Borders;
using iText.Kernel.Font;
using iText.IO.Font.Constants;
using erpsystem.Server.Models.DTOs.erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvoiceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<InvoiceController> _logger;
        private readonly string _invoicesDirectory;

        public InvoiceController(ApplicationDbContext context, ILogger<InvoiceController> logger)
        {
            _context = context;
            _logger = logger;
            _invoicesDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "invoices");
            Directory.CreateDirectory(_invoicesDirectory);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices(string? invoiceType = null)
        {
            _logger.LogDebug("GetInvoices called with invoiceType: {InvoiceType}", invoiceType);
            var query = _context.Invoices
                .Where(i => !i.IsDeleted);

            if (!string.IsNullOrEmpty(invoiceType))
            {
                query = query.Where(i => i.InvoiceType == invoiceType);
            }

            var invoices = await query
                .Select(i => new InvoiceDto
                {
                    Id = i.Id,
                    OrderId = i.OrderId,
                    InvoiceNumber = i.InvoiceNumber,
                    IssueDate = i.IssueDate,
                    DueDate = i.DueDate,
                    ContractorId = i.ContractorId,
                    ContractorName = i.ContractorName,
                    TotalAmount = i.TotalAmount,
                    VatAmount = i.VatAmount,
                    NetAmount = i.NetAmount,
                    Status = i.Status,
                    FilePath = i.FilePath,
                    CreatedBy = i.CreatedBy,
                    CreatedDate = i.CreatedDate,
                    InvoiceType = i.InvoiceType,
                    RelatedInvoiceId = i.RelatedInvoiceId,
                    AdvanceAmount = i.AdvanceAmount
                })
                .ToListAsync();

            _logger.LogDebug("Returning {Count} invoices", invoices.Count);
            return Ok(invoices);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceDto>> GetInvoice(int id)
        {
            _logger.LogDebug("GetInvoice called for ID: {InvoiceId}", id);
            var invoice = await _context.Invoices
                .Where(i => i.Id == id && !i.IsDeleted)
                .Select(i => new InvoiceDto
                {
                    Id = i.Id,
                    OrderId = i.OrderId,
                    InvoiceNumber = i.InvoiceNumber,
                    IssueDate = i.IssueDate,
                    DueDate = i.DueDate,
                    ContractorId = i.ContractorId,
                    ContractorName = i.ContractorName,
                    TotalAmount = i.TotalAmount,
                    VatAmount = i.VatAmount,
                    NetAmount = i.NetAmount,
                    Status = i.Status,
                    FilePath = i.FilePath,
                    CreatedBy = i.CreatedBy,
                    CreatedDate = i.CreatedDate,
                    InvoiceType = i.InvoiceType,
                    RelatedInvoiceId = i.RelatedInvoiceId,
                    AdvanceAmount = i.AdvanceAmount
                })
                .FirstOrDefaultAsync();

            if (invoice == null)
            {
                _logger.LogWarning("Invoice with ID {InvoiceId} not found", id);
                return NotFound();
            }

            return Ok(invoice);
        }

        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadInvoice(int id)
        {
            _logger.LogDebug("DownloadInvoice called for ID: {InvoiceId}", id);
            var invoice = await _context.Invoices
                .Where(i => i.Id == id && !i.IsDeleted)
                .FirstOrDefaultAsync();

            if (invoice == null)
            {
                _logger.LogWarning("Invoice with ID {InvoiceId} not found", id);
                return NotFound("Invoice not found");
            }

            string filePath;
            if (string.IsNullOrEmpty(invoice.FilePath) || !System.IO.File.Exists(Path.Combine(_invoicesDirectory, Path.GetFileName(invoice.FilePath))))
            {
                _logger.LogDebug("Generating new PDF for invoice ID: {InvoiceId}", id);
                filePath = await GenerateInvoicePdf(invoice);
                invoice.FilePath = Path.Combine("invoices", Path.GetFileName(filePath));
                await _context.SaveChangesAsync();
            }
            else
            {
                filePath = Path.Combine(_invoicesDirectory, Path.GetFileName(invoice.FilePath));
            }

            if (!System.IO.File.Exists(filePath))
            {
                _logger.LogError("Invoice file does not exist at path: {FilePath}", filePath);
                return NotFound("Invoice file does not exist on server");
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            _logger.LogDebug("Returning PDF file for invoice ID: {InvoiceId}", id);
            return File(fileBytes, "application/pdf", "Invoice_" + invoice.InvoiceNumber + ".pdf");
        }

        private async Task<string> GenerateInvoicePdf(Invoice invoice)
        {
            _logger.LogDebug("Generating PDF for invoice: {InvoiceNumber}", invoice.InvoiceNumber);
            var fileName = $"Invoice_{invoice.InvoiceNumber}.pdf";
            var filePath = Path.Combine(_invoicesDirectory, fileName);

            var contractor = await _context.Contractors
                .Where(c => c.Id == invoice.ContractorId && !c.IsDeleted)
                .Select(c => new ContractorDTO
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    TaxId = c.TaxId,
                    Phone = c.Phone,
                    Email = c.Email
                })
                .FirstOrDefaultAsync();

            if (contractor == null)
            {
                _logger.LogWarning("Contractor not found for invoice ID: {InvoiceId}, using default data", invoice.Id);
                contractor = new ContractorDTO { Name = invoice.ContractorName, Address = "Brak danych", TaxId = "Brak NIP" };
            }

            var orderItems = await _context.Orders
                .Where(o => o.Id == invoice.OrderId && !o.IsDeleted)
                .SelectMany(o => o.OrderItems)
                .Include(oi => oi.WarehouseItem)
                .Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    WarehouseItemId = oi.WarehouseItemId,
                    WarehouseItemName = oi.WarehouseItem.Name,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    VatRate = oi.VatRate,
                    TotalPrice = oi.TotalPrice
                })
                .ToListAsync();

            if (!orderItems.Any())
            {
                _logger.LogWarning("No order items found for invoice ID: {InvoiceId}, adding default item", invoice.Id);
                orderItems.Add(new OrderItemDto
                {
                    WarehouseItemName = "Przykładowa usługa",
                    Quantity = 1,
                    UnitPrice = invoice.NetAmount,
                    VatRate = 0.23m,
                    TotalPrice = invoice.NetAmount
                });
            }

            decimal netAmount = orderItems.Sum(item => item.TotalPrice);
            decimal vatAmount = orderItems.Sum(item => item.TotalPrice * item.VatRate);
            decimal totalAmount = netAmount + vatAmount;

            using (var writer = new PdfWriter(filePath))
            using (var pdf = new PdfDocument(writer))
            using (var document = new Document(pdf, iText.Kernel.Geom.PageSize.A4))
            {
                var font = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
                var boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

                Table headerTable = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth();
                Cell companyCell = new Cell()
                    .Add(new Paragraph("Twoja Firma Sp. z o.o.")
                        .SetFont(boldFont)
                        .SetFontSize(14))
                    .Add(new Paragraph("ul. Przykładowa 123, 00-000 Warszawa")
                        .SetFont(font)
                        .SetFontSize(10))
                    .Add(new Paragraph("NIP: 123-456-78-90")
                        .SetFont(font)
                        .SetFontSize(10))
                    .Add(new Paragraph("Tel: +48 123 456 789")
                        .SetFont(font)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER);
                headerTable.AddCell(companyCell);

                try
                {
                    string logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "logo.png");
                    if (System.IO.File.Exists(logoPath))
                    {
                        Image logo = new Image(ImageDataFactory.Create(logoPath))
                            .ScaleToFit(100, 100)
                            .SetHorizontalAlignment(HorizontalAlignment.RIGHT);
                        Cell logoCell = new Cell().Add(logo).SetBorder(Border.NO_BORDER);
                        headerTable.AddCell(logoCell);
                    }
                    else
                    {
                        headerTable.AddCell(new Cell().SetBorder(Border.NO_BORDER));
                    }
                }
                catch
                {
                    headerTable.AddCell(new Cell().SetBorder(Border.NO_BORDER));
                }
                document.Add(headerTable);

                document.Add(new Paragraph($"Faktura VAT nr {invoice.InvoiceNumber}")
                    .SetFont(boldFont)
                    .SetFontSize(16)
                    .SetTextAlignment(TextAlignment.CENTER)
                    .SetMarginTop(20)
                    .SetMarginBottom(20));

                Table detailsTable = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth();
                if (invoice.InvoiceType == "Purchase")
                {
                    detailsTable.AddCell(new Cell()
                        .Add(new Paragraph("Nabywca:")
                            .SetFont(boldFont)
                            .SetFontSize(10))
                        .Add(new Paragraph("Twoja Firma Sp. z o.o.")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("ul. Przykładowa 123")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("00-000 Warszawa")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("NIP: 123-456-78-90")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("Tel: +48 123 456 789")
                            .SetFont(font)
                            .SetFontSize(10))
                        .SetBorder(Border.NO_BORDER));
                    detailsTable.AddCell(new Cell()
                        .Add(new Paragraph("Sprzedawca:")
                            .SetFont(boldFont)
                            .SetFontSize(10))
                        .Add(new Paragraph(contractor.Name)
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph(contractor.Address)
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"NIP: {contractor.TaxId}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"Tel: {contractor.Phone}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"Email: {contractor.Email}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .SetBorder(Border.NO_BORDER));
                }
                else
                {
                    detailsTable.AddCell(new Cell()
                        .Add(new Paragraph("Sprzedawca:")
                            .SetFont(boldFont)
                            .SetFontSize(10))
                        .Add(new Paragraph("Twoja Firma Sp. z o.o.")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("ul. Przykładowa 123")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("00-000 Warszawa")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("NIP: 123-456-78-90")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph("Tel: +48 123 456 789")
                            .SetFont(font)
                            .SetFontSize(10))
                        .SetBorder(Border.NO_BORDER));
                    detailsTable.AddCell(new Cell()
                        .Add(new Paragraph("Nabywca:")
                            .SetFont(boldFont)
                            .SetFontSize(10))
                        .Add(new Paragraph(contractor.Name)
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph(contractor.Address)
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"NIP: {contractor.TaxId}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"Tel: {contractor.Phone}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .Add(new Paragraph($"Email: {contractor.Email}")
                            .SetFont(font)
                            .SetFontSize(10))
                        .SetBorder(Border.NO_BORDER));
                }
                document.Add(detailsTable);

                document.Add(new Paragraph($"Data wystawienia: {invoice.IssueDate:dd.MM.yyyy}")
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetMarginTop(10));
                document.Add(new Paragraph($"Data płatności: {invoice.DueDate:dd.MM.yyyy}")
                    .SetFont(font)
                    .SetFontSize(10));
                document.Add(new Paragraph($"Typ faktury: {invoice.InvoiceType}")
                    .SetFont(font)
                    .SetFontSize(10));
                document.Add(new Paragraph($"Status: {invoice.Status}")
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetMarginBottom(20));

                Table itemsTable = new Table(UnitValue.CreatePercentArray(new float[] { 5, 35, 10, 15, 15, 10, 10 }))
                    .UseAllAvailableWidth()
                    .SetMarginBottom(20);
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Lp.").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Nazwa towaru/usługi").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Ilość").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Cena netto (PLN)").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Wartość netto (PLN)").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("VAT (%)").SetFont(boldFont).SetFontSize(10)));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("VAT (PLN)").SetFont(boldFont).SetFontSize(10)));

                int index = 1;
                foreach (var item in orderItems)
                {
                    decimal vatValue = item.TotalPrice * item.VatRate;
                    itemsTable.AddCell(new Cell().Add(new Paragraph($"{index++}").SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.WarehouseItemName).SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.Quantity.ToString()).SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph($"{item.UnitPrice:C2}").SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph($"{item.TotalPrice:C2}").SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph($"{item.VatRate * 100:F0}").SetFont(font).SetFontSize(10)));
                    itemsTable.AddCell(new Cell().Add(new Paragraph($"{vatValue:C2}").SetFont(font).SetFontSize(10)));
                }

                document.Add(itemsTable);

                Table totalsTable = new Table(UnitValue.CreatePercentArray(new float[] { 80, 20 }))
                    .UseAllAvailableWidth()
                    .SetHorizontalAlignment(HorizontalAlignment.RIGHT);
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph("Suma netto:")
                        .SetFont(boldFont)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph($"{netAmount:C2}")
                        .SetFont(font)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph("VAT:")
                        .SetFont(boldFont)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph($"{vatAmount:C2}")
                        .SetFont(font)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph("Suma brutto:")
                        .SetFont(boldFont)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                totalsTable.AddCell(new Cell()
                    .Add(new Paragraph($"{totalAmount:C2}")
                        .SetFont(font)
                        .SetFontSize(10))
                    .SetBorder(Border.NO_BORDER));
                document.Add(totalsTable);

                document.Add(new Paragraph("Warunki płatności: Przelew bankowy w terminie 14 dni")
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetMarginTop(20));
                document.Add(new Paragraph("Numer konta: PL12 3456 7890 1234 5678 9012 3456")
                    .SetFont(font)
                    .SetFontSize(10));
                document.Add(new Paragraph("Bank: Przykładowy Bank S.A.")
                    .SetFont(font)
                    .SetFontSize(10));
                document.Close();
            }

            _logger.LogDebug("PDF generated successfully for invoice: {InvoiceNumber} at {FilePath}", invoice.InvoiceNumber, filePath);
            return filePath;
        }
    }
}