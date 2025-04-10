using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    public class CreateWarehouseItemDto
    {
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

        [StringLength(50, ErrorMessage = "Lokalizacja nie może przekraczać 50 znaków")]
        public string Location { get; set; }

        [Required(ErrorMessage = "Magazyn jest wymagany")]
        [StringLength(50, ErrorMessage = "Nazwa magazynu nie może przekraczać 50 znaków")]
        public string Warehouse { get; set; }

        [Required(ErrorMessage = "Jednostka miary jest wymagana")]
        [StringLength(20, ErrorMessage = "Jednostka miary nie może przekraczać 20 znaków")]
        public string UnitOfMeasure { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Minimalny stan musi być nieujemny")]
        public int MinimumStock { get; set; }

        [StringLength(100, ErrorMessage = "Nazwa dostawcy nie może przekraczać 100 znaków")]
        public string Supplier { get; set; }

        [StringLength(50, ErrorMessage = "Numer partii nie może przekraczać 50 znaków")]
        public string BatchNumber { get; set; }

        public DateTime? ExpirationDate { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Koszt zakupu musi być nieujemny")]
        public decimal PurchaseCost { get; set; }

        [Range(0, 1, ErrorMessage = "Stawka VAT musi być między 0 a 1 (np. 0.23 dla 23%)")]
        public decimal VatRate { get; set; }
    }
}