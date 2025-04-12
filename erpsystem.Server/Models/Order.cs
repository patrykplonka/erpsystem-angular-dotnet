namespace erpsystem.Server.Models
{
    public class Order
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public int ContractorId { get; set; }
        public Contractor Contractor { get; set; }
        public string OrderType { get; set; } = "Purchase"; 
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft"; 
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;
        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}