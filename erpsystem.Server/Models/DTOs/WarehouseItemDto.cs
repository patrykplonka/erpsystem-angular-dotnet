using System;

namespace erpsystem.Server.Models.DTOs
{
    public class WarehouseItemDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Code { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public required string Category { get; set; }
        public required string Location { get; set; }
        public required string Warehouse { get; set; }
        public required string UnitOfMeasure { get; set; }
        public int MinimumStock { get; set; }
        public int? ContractorId { get; set; }
        public string? ContractorName { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public decimal VatRate { get; set; }
        public bool IsDeleted { get; set; }
    }
}