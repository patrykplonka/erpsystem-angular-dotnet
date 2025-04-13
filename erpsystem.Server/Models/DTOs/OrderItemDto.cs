using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    namespace erpsystem.Server.Models.DTOs
    {
        public class OrderItemDto
        {
            public int Id { get; set; }

            public int OrderId { get; set; }

            [Required(ErrorMessage = "Produkt jest wymagany")]
            public int WarehouseItemId { get; set; }

            public string WarehouseItemName { get; set; } = string.Empty;

            [Range(1, int.MaxValue, ErrorMessage = "Ilość musi być większa od 0")]
            public int Quantity { get; set; }

            [Range(0, double.MaxValue, ErrorMessage = "Cena jednostkowa musi być nieujemna")]
            public decimal UnitPrice { get; set; }

            [Range(0, 1, ErrorMessage = "Stawka VAT musi być między 0 a 1")]
            public decimal VatRate { get; set; }

            public decimal TotalPrice { get; set; }
        }
    }
}