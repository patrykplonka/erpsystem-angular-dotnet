using System;

namespace erpsystem.Server.Models.DTOs
{
    public class OperationLogDto
    {
        public int Id { get; set; }
        public required string User { get; set; }
        public required string Operation { get; set; }
        public int ItemId { get; set; }
        public required string ItemName { get; set; }
        public required DateTime Timestamp { get; set; }
        public required string Details { get; set; }
    }
}