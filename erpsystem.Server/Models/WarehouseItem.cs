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
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public string CreatedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
        public string Location { get; set; }
    }
}
