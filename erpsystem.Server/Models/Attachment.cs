namespace erpsystem.Server.Models
{
    public class Attachment
    {
        public int Id { get; set; }
        public int MovementId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadDate { get; set; }
        public WarehouseMovements Movement { get; set; } = null!;
    }
}