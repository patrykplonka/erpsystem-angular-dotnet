﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
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
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Net.Sockets;
using System.Net;
using Microsoft.AspNetCore.Http;
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
        private readonly IConfiguration _configuration;

        public InvoiceController(ApplicationDbContext context, ILogger<InvoiceController> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _invoicesDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "invoices");
            Directory.CreateDirectory(_invoicesDirectory);
        }

        [HttpPost]
        public async Task<IActionResult> CreateInvoice([FromBody] InvoiceDto invoiceDto)
        {
            _logger.LogDebug("CreateInvoice called for invoice number: {InvoiceNumber}", invoiceDto.InvoiceNumber);

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for invoice creation: {Errors}", string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(ModelState);
            }

            var validInvoiceTypes = new[] { "Sales", "Purchase", "Corrective", "Proforma", "Advance", "Final" };
            if (!validInvoiceTypes.Contains(invoiceDto.InvoiceType))
            {
                _logger.LogWarning("Invalid invoice type: {InvoiceType}", invoiceDto.InvoiceType);
                return BadRequest("Nieprawidłowy typ faktury.");
            }

            if ((invoiceDto.InvoiceType == "Corrective" || invoiceDto.InvoiceType == "Final") && invoiceDto.RelatedInvoiceId.HasValue)
            {
                var relatedInvoice = await _context.Invoices.FindAsync(invoiceDto.RelatedInvoiceId.Value);
                if (relatedInvoice == null || relatedInvoice.IsDeleted)
                {
                    _logger.LogWarning("Related invoice ID {RelatedInvoiceId} not found", invoiceDto.RelatedInvoiceId);
                    return BadRequest("Powiązana faktura nie istnieje.");
                }
            }

            var contractor = await _context.Contractors
                .Where(c => c.Id == invoiceDto.ContractorId && !c.IsDeleted)
                .FirstOrDefaultAsync();
            if (contractor == null)
            {
                _logger.LogWarning("Contractor ID {ContractorId} not found", invoiceDto.ContractorId);
                return BadRequest("Kontrahent nie istnieje.");
            }

            var invoice = new Invoice
            {
                OrderId = invoiceDto.OrderId,
                InvoiceNumber = invoiceDto.InvoiceNumber,
                IssueDate = invoiceDto.IssueDate.ToUniversalTime(),
                DueDate = invoiceDto.DueDate.ToUniversalTime(),
                ContractorId = invoiceDto.ContractorId,
                ContractorName = contractor.Name,
                TotalAmount = invoiceDto.TotalAmount,
                VatAmount = invoiceDto.VatAmount,
                NetAmount = invoiceDto.NetAmount,
                Status = invoiceDto.Status,
                InvoiceType = invoiceDto.InvoiceType,
                RelatedInvoiceId = invoiceDto.RelatedInvoiceId,
                AdvanceAmount = invoiceDto.AdvanceAmount,
                CreatedBy = User.Identity?.Name ?? "Unknown",
                CreatedDate = DateTime.UtcNow,
                IsDeleted = false
            };

            if (invoiceDto.items?.Any() ?? false)
            {
                _logger.LogDebug("Received items: {Items}", string.Join(", ", invoiceDto.items.Select(i => i.productName)));
            }

            try
            {
                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                invoice.FilePath = await GenerateInvoicePdf(invoice);
                await _context.SaveChangesAsync();

                _logger.LogDebug("Invoice created successfully: {InvoiceNumber}", invoice.InvoiceNumber);
                return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error creating invoice {InvoiceNumber}: {Error}", invoice.InvoiceNumber, ex.Message);
                return StatusCode(500, "Wystąpił błąd podczas tworzenia faktury.");
            }
        }

        [HttpGet]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices(
            string? invoiceType = null,
            string sortField = "InvoiceNumber",
            string sortDirection = "asc")
        {
            _logger.LogDebug("GetInvoices called with invoiceType: {InvoiceType}, sortField: {SortField}, sortDirection: {SortDirection}",
                invoiceType ?? "null", sortField, sortDirection);

            var query = _context.Invoices
                .Where(i => !i.IsDeleted);

            if (!string.IsNullOrEmpty(invoiceType))
            {
                _logger.LogDebug("Filtering invoices by invoiceType: {InvoiceType}", invoiceType);
                query = query.Where(i => i.InvoiceType == invoiceType);
            }

            var validSortFields = new[] { "InvoiceNumber", "IssueDate", "DueDate", "TotalAmount", "Status", "InvoiceType", "CreatedDate" };
            if (!validSortFields.Contains(sortField))
            {
                _logger.LogWarning("Invalid sortField: {SortField}, defaulting to InvoiceNumber", sortField);
                sortField = "InvoiceNumber";
            }

            try
            {
                query = ApplySorting(query, sortField, sortDirection.ToLower() == "desc");
            }
            catch (Exception ex)
            {
                _logger.LogError("Error sorting invoices with sortField: {SortField}, error: {Error}", sortField, ex.Message);
                query = query.OrderBy(i => i.InvoiceNumber);
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
                    AdvanceAmount = i.AdvanceAmount,
                    KSeFId = i.KSeFId
                })
                .ToListAsync();

            _logger.LogDebug("Returning {Count} invoices with types: {Types}", invoices.Count, string.Join(", ", invoices.Select(i => i.InvoiceType).Distinct()));
            return Ok(invoices);
        }

        private IQueryable<Invoice> ApplySorting(IQueryable<Invoice> query, string sortField, bool descending)
        {
            switch (sortField)
            {
                case "InvoiceNumber":
                    return descending ? query.OrderByDescending(i => i.InvoiceNumber) : query.OrderBy(i => i.InvoiceNumber);
                case "IssueDate":
                    return descending ? query.OrderByDescending(i => i.IssueDate) : query.OrderBy(i => i.IssueDate);
                case "DueDate":
                    return descending ? query.OrderByDescending(i => i.DueDate) : query.OrderBy(i => i.DueDate);
                case "TotalAmount":
                    return descending ? query.OrderByDescending(i => i.TotalAmount) : query.OrderBy(i => i.TotalAmount);
                case "Status":
                    return descending ? query.OrderByDescending(i => i.Status) : query.OrderBy(i => i.Status);
                case "InvoiceType":
                    return descending ? query.OrderByDescending(i => i.InvoiceType) : query.OrderBy(i => i.InvoiceType);
                case "CreatedDate":
                    return descending ? query.OrderByDescending(i => i.CreatedDate) : query.OrderBy(i => i.CreatedDate);
                default:
                    return query.OrderBy(i => i.InvoiceNumber);
            }
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
                    AdvanceAmount = i.AdvanceAmount,
                    KSeFId = i.KSeFId
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

        [HttpPost("send-to-ksef/{id}")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<IActionResult> SendToKSeF(int id)
        {
            _logger.LogDebug("SendToKSeF called for invoice ID: {InvoiceId}", id);
            var invoice = await _context.Invoices
                .Include(i => i.Order)
                .ThenInclude(o => o.OrderItems)
                .ThenInclude(oi => oi.WarehouseItem)
                .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

            if (invoice == null)
            {
                _logger.LogWarning("Invoice with ID {InvoiceId} not found", id);
                return NotFound($"Faktura o ID {id} nie znaleziona.");
            }

            if (!string.IsNullOrEmpty(invoice.KSeFId))
            {
                _logger.LogWarning("Invoice with ID {InvoiceId} already sent to KSeF with ID {KSeFId}", id, invoice.KSeFId);
                return BadRequest("Faktura została już wysłana do KSeF.");
            }

            try
            {
                var xml = GenerateKSeFXml(invoice);
                var ksefResponse = await SendToKSeFAsync(xml, invoice.Id, maxRetries: 3, retryDelayMs: 1000);

                invoice.KSeFId = ksefResponse.KSeFId ?? $"TEST-{id}";
                await _context.SaveChangesAsync();

                _logger.LogDebug("Invoice ID {InvoiceId} sent to KSeF with KSeFId {KSeFId}", id, invoice.KSeFId);
                return Ok(new { KSeFId = invoice.KSeFId });
            }
            catch (HttpRequestException ex) when (ex.InnerException is SocketException)
            {
                _logger.LogError("Failed to connect to KSeF API due to network error: {Error}. Check DNS resolution and network connectivity for '{KSeFUrl}'.", ex.Message, _configuration["KSeF:ApiUrl"]);
                return StatusCode(503, "Nie można połączyć się z KSeF z powodu problemów z siecią. Sprawdź połączenie internetowe i dostępność API KSeF.");
            }
            catch (Exception ex)
            {
                _logger.LogError("Failed to send invoice to KSeF: {Error}", ex.Message);
                return StatusCode(500, "Wystąpił błąd podczas wysyłania faktury do KSeF. Spróbuj ponownie później.");
            }
        }

        private string GenerateKSeFXml(Invoice invoice)
        {
            _logger.LogDebug("Generating KSeF XML for invoice: {InvoiceNumber}", invoice.InvoiceNumber);
            var xml = new StringBuilder();
            xml.AppendLine(@"<?xml version=""1.0"" encoding=""UTF-8""?>");
            xml.AppendLine(@"<Invoice xmlns=""http://crd.gov.pl/wzor/2021/11/29/FA/2/"">");
            xml.AppendLine(@"  <Header>");
            xml.AppendLine($"    <InvoiceNumber>{invoice.InvoiceNumber}</InvoiceNumber>");
            xml.AppendLine($"    <IssueDate>{invoice.IssueDate:yyyy-MM-dd}</IssueDate>");
            xml.AppendLine($"    <InvoiceType>{invoice.InvoiceType}</InvoiceType>");
            xml.AppendLine(@"  </Header>");
            xml.AppendLine(@"  <Seller>");
            xml.AppendLine($"    <Name>{invoice.ContractorName}</Name>");
            xml.AppendLine(@"    <TaxNumber>2222222222</TaxNumber>");
            xml.AppendLine(@"  </Seller>");
            xml.AppendLine(@"  <InvoiceLines>");

            var orderItems = invoice.Order?.OrderItems ?? new List<OrderItem>();
            foreach (var item in orderItems)
            {
                xml.AppendLine(@"    <InvoiceLine>");
                xml.AppendLine($"      <Description>{item.WarehouseItem?.Name ?? "Usługa"}</Description>");
                xml.AppendLine($"      <Quantity>{item.Quantity}</Quantity>");
                xml.AppendLine($"      <UnitPrice>{item.UnitPrice}</UnitPrice>");
                xml.AppendLine($"      <VatRate>{item.VatRate * 100:F0}</VatRate>");
                xml.AppendLine(@"    </InvoiceLine>");
            }

            xml.AppendLine(@"  </InvoiceLines>");
            xml.AppendLine($"  <TotalAmount>{invoice.TotalAmount}</TotalAmount>");
            xml.AppendLine(@"</Invoice>");

            return xml.ToString();
        }

        private async Task<KSeFResponse> SendToKSeFAsync(string xml, int invoiceId, int maxRetries, int retryDelayMs)
        {
            var ksefUrl = _configuration["KSeF:ApiUrl"] ?? "https://api.ksef-test.mf.gov.pl/api/invoice";
            _logger.LogDebug("Sending XML to KSeF API at '{KSeFUrl}' for invoice ID: {InvoiceId}", ksefUrl, invoiceId);

            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                _logger.LogDebug("Simulating KSeF response in Development environment for invoice ID: {InvoiceId}", invoiceId);
                return new KSeFResponse { KSeFId = $"MOCK-KSEF-{Guid.NewGuid().ToString()}" };
            }

            using var client = new HttpClient();
            var request = new HttpRequestMessage(HttpMethod.Post, ksefUrl);
            request.Headers.Add("Authorization", $"Bearer {_configuration["KSeF:Token"] ?? "test-token"}");
            request.Content = new StringContent(xml, Encoding.UTF8, "application/xml");

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    var hostEntry = await Dns.GetHostEntryAsync(new Uri(ksefUrl).Host);
                    var ipAddress = hostEntry.AddressList.FirstOrDefault()?.ToString() ?? "Unknown";
                    _logger.LogDebug("Resolved IP for '{KSeFUrl}' is {IPAddress} (attempt {Attempt}/{MaxRetries})", ksefUrl, ipAddress, attempt, maxRetries);

                    var response = await client.SendAsync(request);
                    response.EnsureSuccessStatusCode();
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogDebug("KSeF API response received for invoice ID {InvoiceId}: {Response}", invoiceId, responseContent);
                    return JsonSerializer.Deserialize<KSeFResponse>(responseContent) ?? new KSeFResponse { KSeFId = $"TEST-{invoiceId}" };
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    _logger.LogWarning("Attempt {Attempt}/{MaxRetries} failed for invoice ID {InvoiceId}: {Error}", attempt, maxRetries, invoiceId, ex.Message);
                    if (attempt == maxRetries)
                    {
                        throw;
                    }
                    await Task.Delay(retryDelayMs);
                }
                catch (Exception ex)
                {
                    _logger.LogError("Unexpected error during KSeF request for invoice ID {InvoiceId}: {Error}", invoiceId, ex.Message);
                    throw;
                }
            }

            throw new HttpRequestException("Failed to connect to KSeF API after maximum retries.");
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
                    .SetFontSize(10));
                if (!string.IsNullOrEmpty(invoice.KSeFId))
                {
                    document.Add(new Paragraph($"Numer KSeF: {invoice.KSeFId}")
                        .SetFont(font)
                        .SetFontSize(10));
                }
                document.Add(new Paragraph().SetMarginBottom(20));

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

    public class KSeFResponse
    {
        public string? KSeFId { get; set; }
    }
}