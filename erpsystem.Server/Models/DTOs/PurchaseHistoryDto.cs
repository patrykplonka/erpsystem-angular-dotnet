namespace erpsystem.Server.Models.DTOs
{
    public class PurchaseHistoryDto
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public string Action { get; set; }
        public string ModifiedBy { get; set; }
        public string ModifiedDate { get; set; }
        public string Details { get; set; }
    }
}