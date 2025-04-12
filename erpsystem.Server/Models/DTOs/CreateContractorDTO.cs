namespace erpsystem.Server.Models.DTOs
{
    public class CreateContractorDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Supplier";
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string TaxId { get; set; } = string.Empty;
    }
}
