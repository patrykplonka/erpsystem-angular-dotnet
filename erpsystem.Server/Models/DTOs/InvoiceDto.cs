using System;

namespace erpsystem.Server.Models.DTOs
{
    public class InvoiceDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public required string InvoiceNumber { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
        public int ContractorId { get; set; }
        public required string ContractorName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal NetAmount { get; set; }
        public required string Status { get; set; }
        public string? FilePath { get; set; } 
        public required string CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public required string InvoiceType { get; set; }
        public int? RelatedInvoiceId { get; set; }
        public decimal? AdvanceAmount { get; set; }
        public Order? Order { get; set; }

        public string? KSeFId { get; set; }
    }
}