using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    public class UpdateWarehouseItemDto
    {
        [Required(ErrorMessage = "Id jest wymagane")]
        public int Id { get; set; }

        [Required(ErrorMessage = "Nazwa jest wymagana")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Nazwa musi mieć od 2 do 100 znaków")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Kod jest wymagany")]
        [StringLength(50, ErrorMessage = "Kod nie może przekraczać 50 znaków")]
        public string Code { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Ilość musi być nieujemna")]
        public int Quantity { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Cena musi być nieujemna")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "Kategoria jest wymagana")]
        [StringLength(50, ErrorMessage = "Kategoria nie może przekraczać 50 znaków")]
        public string Category { get; set; }
    }
}
