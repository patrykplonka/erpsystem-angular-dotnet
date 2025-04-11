public class CreateWarehouseItemDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Warehouse { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public int MinimumStock { get; set; }
    public int? ContractorId { get; set; } 
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ExpirationDate { get; set; }
    public decimal PurchaseCost { get; set; }
    public decimal VatRate { get; set; }
}