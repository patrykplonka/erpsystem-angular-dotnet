using System;

namespace erpsystem.Server.Models.DTOs
{
    public class OrderHistoryDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public required string Action { get; set; }
        public required string ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; }
        public required string Details { get; set; }
    }
}