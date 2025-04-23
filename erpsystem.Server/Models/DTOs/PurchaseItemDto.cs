namespace erpsystem.Server.Models.DTOs
{
    public class PurchaseItemDto
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public int WarehouseItemId { get; set; }
        public string WarehouseItemName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal VatRate { get; set; }
        public decimal TotalPrice { get; set; }
    }
}