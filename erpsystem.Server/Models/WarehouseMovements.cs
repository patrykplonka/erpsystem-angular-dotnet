namespace erpsystem.Server.Models
{
    public class WarehouseMovements
    {
        public int Id { get; set; }
        public int WarehouseItemId { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string Status { get; set; } = "Planned";
        public string Comment { get; set; } = string.Empty;
    }
}