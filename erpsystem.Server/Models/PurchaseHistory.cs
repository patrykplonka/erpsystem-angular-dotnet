namespace erpsystem.Server.Models
{
    public class PurchaseHistory
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public string Action { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; }
        public string Details { get; set; }
    }
}