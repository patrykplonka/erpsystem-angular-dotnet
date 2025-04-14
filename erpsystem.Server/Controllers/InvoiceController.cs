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