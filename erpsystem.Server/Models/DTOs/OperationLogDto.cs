namespace erpsystem.Server.Models.DTOs
{
    public class OperationLogDto
    {
        public int Id { get; set; }
        public string User { get; set; }
        public string Operation { get; set; }
        public int ItemId { get; set; }
        public string ItemName { get; set; }
        public string Timestamp { get; set; }
        public string Details { get; set; }
    }
}