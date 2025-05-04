using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models.DTOs
{
    public class LocationDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Nazwa jest wymagana")]
        [StringLength(50, ErrorMessage = "Nazwa nie może przekraczać 50 znaków")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Typ jest wymagany")]
        [StringLength(20, ErrorMessage = "Typ nie może przekraczać 20 znaków")]
        public string Type { get; set; } = string.Empty; 
    }
}