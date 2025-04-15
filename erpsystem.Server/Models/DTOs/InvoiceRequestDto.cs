using System;

namespace erpsystem.Server.Models.DTOs
{
    public class InvoiceRequestDto
    {
        public int OrderId { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
    }
}