using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;

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
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null)
            {
                return NotFound(new { message = $"Faktura o ID {id} nie istnieje." });
            }

            var content = System.Text.Encoding.UTF8.GetBytes($"Faktura: {invoice.InvoiceNumber}\nZamówienie: {invoice.OrderId}\nData wystawienia: {invoice.IssueDate:yyyy-MM-dd}\nKwota brutto: {invoice.TotalAmount}");
            var stream = new MemoryStream(content);
            return File(stream, "application/pdf", $"Invoice_{invoice.InvoiceNumber}.pdf");
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