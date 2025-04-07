namespace erpsystem.Server.Models
{
    public class WarehouseMovements
    {
        public int Id { get; set; }
        public int WarehouseItemId { get; set; }
        public string MovementType { get; set; } 
        public int Quantity { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string Description { get; set; }
        public string CreatedBy { get; set; }
        public string Status { get; set; } 
        public string Comment { get; set; }
    }
}
