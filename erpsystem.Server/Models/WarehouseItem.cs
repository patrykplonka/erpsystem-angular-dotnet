namespace erpsystem.Server.Models
{
    public class WarehouseItem
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Category { get; set; }
        public string Location { get; set; }
        public string Warehouse { get; set; } 
        public string UnitOfMeasure { get; set; } 
        public int MinimumStock { get; set; } 
        public string Supplier { get; set; } 
        public string BatchNumber { get; set; } 
        public DateTime? ExpirationDate { get; set; } 
        public decimal PurchaseCost { get; set; } 
        public decimal VatRate { get; set; } 
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public string CreatedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
    }
}