using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models
{
    public class Location
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Nazwa jest wymagana")]
        [StringLength(50, ErrorMessage = "Nazwa nie może przekraczać 50 znaków")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Typ jest wymagany")]
        public string Type { get; set; } = string.Empty;
    }
}