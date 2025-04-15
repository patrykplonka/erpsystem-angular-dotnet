using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using System.IO;
using iText.Kernel.Pdf.Canvas.Draw;
using iText.Kernel.Colors;
using iText.Kernel.Geom;
using iText.Layout.Borders;

namespace erpsystem.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InvoicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InvoicesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<InvoiceDto[]>> GetInvoices()
        {
            var invoices = await _context.Invoices
                .Where(i => !string.IsNullOrEmpty(i.InvoiceNumber))
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
                    CreatedDate = i.CreatedDate
                })
                .ToArrayAsync();

            return Ok(invoices);
        }

        [HttpPost("generate/{orderId}")]
        public async Task<ActionResult<InvoiceDto>> GenerateInvoice(int orderId, [FromBody] InvoiceRequestDto request)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

            if (order == null)
            {
                return NotFound(new { message = $"Zamówienie o ID {orderId} nie istnieje." });
            }

            if (order.Status != "Confirmed" && order.Status != "Completed")
            {
                return BadRequest(new { message = "Faktury można generować tylko dla zamówień w statusie Confirmed lub Completed." });
            }

            var contractor = await _context.Contractors.FindAsync(order.ContractorId);
            if (contractor == null)
            {
                return BadRequest(new { message = $"Kontrahent o ID {order.ContractorId} nie istnieje." });
            }

            var invoiceNumber = await GenerateInvoiceNumber();
            var netAmount = order.OrderItems.Sum(oi => oi.Quantity * oi.UnitPrice);
            var vatAmount = order.OrderItems.Sum(oi => oi.Quantity * oi.UnitPrice * (oi.VatRate / 100));
            var totalAmount = netAmount + vatAmount;

            var invoice = new Invoice
            {
                OrderId = order.Id,
                InvoiceNumber = invoiceNumber,
                IssueDate = request.IssueDate,
                DueDate = request.DueDate,
                ContractorId = order.ContractorId,
                ContractorName = contractor.Name,
                TotalAmount = totalAmount,
                VatAmount = vatAmount,
                NetAmount = netAmount,
                Status = "Draft",
                CreatedBy = "System",
                CreatedDate = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            var invoiceDto = new InvoiceDto
            {
                Id = invoice.Id,
                OrderId = invoice.OrderId,
                InvoiceNumber = invoice.InvoiceNumber,
                IssueDate = invoice.IssueDate,
                DueDate = invoice.DueDate,
                ContractorId = invoice.ContractorId,
                ContractorName = invoice.ContractorName,
                TotalAmount = invoice.TotalAmount,
                VatAmount = invoice.VatAmount,
                NetAmount = invoice.NetAmount,
                Status = invoice.Status,
                CreatedBy = invoice.CreatedBy,
                CreatedDate = invoice.CreatedDate,
                FilePath = invoice.FilePath
            };

            return Ok(invoiceDto);
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadInvoice(int id)
        {
            try
            {
                var invoice = await _context.Invoices.FindAsync(id);
                if (invoice == null)
                {
                    return NotFound(new { message = $"Faktura o ID {id} nie istnieje." });
                }

                var order = await _context.Orders
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.WarehouseItem)
                    .FirstOrDefaultAsync(o => o.Id == invoice.OrderId);

                if (order == null)
                {
                    return NotFound(new { message = $"Zamówienie o ID {invoice.OrderId} nie istnieje." });
                }

                var recipientContractor = await _context.Contractors
                    .FirstOrDefaultAsync(c => c.Id == invoice.ContractorId && !c.IsDeleted);
                if (recipientContractor == null)
                {
                    return NotFound(new { message = $"Kontrahent o ID {invoice.ContractorId} nie istnieje." });
                }

                using var memoryStream = new MemoryStream();
                using var writer = new PdfWriter(memoryStream);
                using var pdf = new PdfDocument(writer);
                using var document = new Document(pdf, PageSize.A4);
                document.SetMargins(36, 36, 36, 36);

                document.Add(new Paragraph("FAKTURA VAT")
                    .SetFontSize(16)
                    .SetBold()
                    .SetTextAlignment(TextAlignment.CENTER));

                var invoiceDetailsTable = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 }))
                    .UseAllAvailableWidth();
                invoiceDetailsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Numer faktury: " + invoice.InvoiceNumber)));
                invoiceDetailsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Data wystawienia: " + invoice.IssueDate.ToString("yyyy-MM-dd"))
                        .SetTextAlignment(TextAlignment.RIGHT)));
                invoiceDetailsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Zamówienie: " + invoice.OrderId)));
                invoiceDetailsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Termin płatności: " + invoice.DueDate.ToString("yyyy-MM-dd"))
                        .SetTextAlignment(TextAlignment.RIGHT)));
                document.Add(invoiceDetailsTable);
                document.Add(new Paragraph("\n"));

                var issuerRecipientTable = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 }))
                    .UseAllAvailableWidth();
                issuerRecipientTable.AddCell(new Cell()
                    .Add(new Paragraph("Sprzedawca:")
                        .SetBold())
                    .Add(new Paragraph("Twoja Firma Sp. z o.o."))
                    .Add(new Paragraph("ul. Przykładowa 123, 00-000 Warszawa"))
                    .Add(new Paragraph("NIP: 1234567890"))
                    .Add(new Paragraph("Email: kontakt@twojafirma.pl"))
                    .Add(new Paragraph("Telefon: +48 123 456 789"))
                    .SetBorder(Border.NO_BORDER));
                issuerRecipientTable.AddCell(new Cell()
                    .Add(new Paragraph("Nabywca:")
                        .SetBold())
                    .Add(new Paragraph(recipientContractor.Name))
                    .Add(new Paragraph(recipientContractor.Address))
                    .Add(new Paragraph($"NIP: {recipientContractor.TaxId}"))
                    .Add(new Paragraph($"Email: {recipientContractor.Email}"))
                    .Add(new Paragraph($"Telefon: {recipientContractor.Phone}"))
                    .SetBorder(Border.NO_BORDER));
                document.Add(issuerRecipientTable);
                document.Add(new Paragraph("\n"));

                document.Add(new LineSeparator(new SolidLine()).SetMarginBottom(10));

                var itemsTable = new Table(UnitValue.CreatePercentArray(new float[] { 5, 35, 15, 15, 15, 15 }))
                    .UseAllAvailableWidth()
                    .SetMarginBottom(10);
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Lp.").SetBold()));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Nazwa").SetBold()));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Ilość").SetBold()));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Cena jedn. (netto)").SetBold()));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("VAT (%)").SetBold()));
                itemsTable.AddHeaderCell(new Cell().Add(new Paragraph("Wartość brutto").SetBold()));

                int itemCount = 1;
                foreach (var item in order.OrderItems)
                {
                    var grossValue = item.Quantity * item.UnitPrice * (1 + item.VatRate / 100);
                    itemsTable.AddCell(new Cell().Add(new Paragraph(itemCount.ToString())));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.WarehouseItem?.Name ?? "Brak nazwy")));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.Quantity.ToString())));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.UnitPrice.ToString("F2") + " PLN")));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(item.VatRate.ToString())));
                    itemsTable.AddCell(new Cell().Add(new Paragraph(grossValue.ToString("F2") + " PLN")));
                    itemCount++;
                }
                document.Add(itemsTable);

                var totalsTable = new Table(UnitValue.CreatePercentArray(new float[] { 70, 30 }))
                    .UseAllAvailableWidth()
                    .SetMarginTop(10);
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("")));
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Suma netto: " + invoice.NetAmount.ToString("F2") + " PLN")
                        .SetTextAlignment(TextAlignment.RIGHT)));
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("")));
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("VAT: " + invoice.VatAmount.ToString("F2") + " PLN")
                        .SetTextAlignment(TextAlignment.RIGHT)));
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("")));
                totalsTable.AddCell(new Cell()
                    .SetBorder(Border.NO_BORDER)
                    .Add(new Paragraph("Suma brutto: " + invoice.TotalAmount.ToString("F2") + " PLN")
                        .SetBold()
                        .SetTextAlignment(TextAlignment.RIGHT)));
                document.Add(totalsTable);

                document.Add(new Paragraph("\n"));
                document.Add(new LineSeparator(new SolidLine()).SetMarginBottom(10));
                document.Add(new Paragraph("Dane do płatności:")
                    .SetBold());
                document.Add(new Paragraph("Bank: Twój Bank S.A."));
                document.Add(new Paragraph("Numer konta: 98 7654 3210 9876 5432 1098 76"));
                document.Add(new Paragraph("Tytuł przelewu: Faktura " + invoice.InvoiceNumber));

                document.Add(new Paragraph("\n"));
                document.Add(new Paragraph("Wystawiono przez: " + invoice.CreatedBy)
                    .SetFontSize(10)
                    .SetTextAlignment(TextAlignment.CENTER));
                document.Add(new Paragraph("Data utworzenia: " + invoice.CreatedDate.ToString("yyyy-MM-dd HH:mm:ss"))
                    .SetFontSize(10)
                    .SetTextAlignment(TextAlignment.CENTER));

                document.Close();
                return File(memoryStream.ToArray(), "application/pdf", $"Invoice_{invoice.InvoiceNumber}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Błąd podczas generowania PDF", details = ex.ToString() });
            }
        }

        private async Task<string> GenerateInvoiceNumber()
        {
            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var prefix = "INV";
            var count = await _context.Invoices
                .CountAsync(i => i.InvoiceNumber.StartsWith($"{prefix}-{today}-"));
            var sequence = (count + 1).ToString("D3");
            return $"{prefix}-{today}-{sequence}";
        }
    }
}