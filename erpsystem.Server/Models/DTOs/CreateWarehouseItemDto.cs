using System;
using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    public class CreateWarehouseItemDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        [Required]
        public string Code { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        [Required]
        public string Category { get; set; } = string.Empty;
        [Required]
        public string Location { get; set; } = string.Empty;
        [Required]
        public string Warehouse { get; set; } = string.Empty;
        [Required]
        public string UnitOfMeasure { get; set; } = string.Empty;
        public int MinimumStock { get; set; }
        public int? ContractorId { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public decimal VatRate { get; set; }
    }
}