namespace erpsystem.Server.Models.DTOs
{
    public class OrderHistoryDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string Action { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; }
        public string Details { get; set; }
    }
}