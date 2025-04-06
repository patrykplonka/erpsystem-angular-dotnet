namespace erpsystem.Server.Models
{
    public class OperationLog
    {
        public int Id { get; set; }
        public string User { get; set; }
        public string Operation { get; set; }
        public int ItemId { get; set; }
        public string ItemName { get; set; }
        public DateTime Timestamp { get; set; }
        public string Details { get; set; }
    }
}