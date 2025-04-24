﻿namespace erpsystem.Server.Models.DTOs
{
    public class PurchaseDto
    {
        public int Id { get; set; }
        public string PurchaseNumber { get; set; }
        public int ContractorId { get; set; }
        public string ContractorName { get; set; }
        public string OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; }
        public string CreatedBy { get; set; }
        public string CreatedDate { get; set; }
        public bool IsDeleted { get; set; }
        public List<PurchaseItemDto> PurchaseItems { get; set; } = new List<PurchaseItemDto>();
    }
}