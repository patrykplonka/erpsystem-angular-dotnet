namespace erpsystem.Server.Models
{
    public class OrderHistory
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string Action { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; }
        public string Details { get; set; }
    }
}