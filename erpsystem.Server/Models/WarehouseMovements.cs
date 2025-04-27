using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace erpsystem.Server.Models
{
    public class WarehouseMovements
    {
        public int Id { get; set; }

        [Required]
        public int WarehouseItemId { get; set; }

        public WarehouseItem? WarehouseItem { get; set; }

        [Required]
        public WarehouseMovementType MovementType { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        public string Supplier { get; set; } = string.Empty;

        public string DocumentNumber { get; set; } = string.Empty;

        public DateTime Date { get; set; }

        public string Description { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public string Status { get; set; } = "Planned";

        public string Comment { get; set; } = string.Empty;

        public int? OrderId { get; set; } 

        [ForeignKey("OrderId")]
        public Order? Order { get; set; } 
    }
}