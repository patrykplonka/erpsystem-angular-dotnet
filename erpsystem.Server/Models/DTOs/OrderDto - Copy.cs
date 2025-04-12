using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    namespace erpsystem.Server.Models.DTOs
    {
        public class OrderDto
        {
            public int Id { get; set; }

            [Required(ErrorMessage = "Numer zamówienia jest wymagany")]
            [StringLength(50, ErrorMessage = "Numer zamówienia nie może przekraczać 50 znaków")]
            public string OrderNumber { get; set; } = string.Empty;

            [Required(ErrorMessage = "Kontrahent jest wymagany")]
            public int ContractorId { get; set; }

            public string ContractorName { get; set; } = string.Empty;

            [Required(ErrorMessage = "Typ zamówienia jest wymagany")]
            public string OrderType { get; set; } = "Purchase";

            public DateTime OrderDate { get; set; } = DateTime.UtcNow;

            public decimal TotalAmount { get; set; }

            [Required(ErrorMessage = "Status jest wymagany")]
            public string Status { get; set; } = "Draft";

            public string CreatedBy { get; set; } = string.Empty;

            public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

            public bool IsDeleted { get; set; } = false;

            public List<OrderItemDto> OrderItems { get; set; } = new List<OrderItemDto>();
        }
    }
}