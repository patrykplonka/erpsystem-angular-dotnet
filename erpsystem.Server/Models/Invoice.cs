using System;
using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        [Required]
        public required string InvoiceNumber { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
        public int ContractorId { get; set; }
        [Required]
        public required string ContractorName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal NetAmount { get; set; }
        [Required]
        public required string Status { get; set; }
        public string? FilePath { get; set; } 
        [Required]
        public required string CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        [Required]
        public required string InvoiceType { get; set; } 
        public int? RelatedInvoiceId { get; set; }
        public decimal? AdvanceAmount { get; set; }
        public bool IsDeleted { get; set; }

        public Order? Order { get; set; }
        public string? KSeFId { get; set; }

    }
}