using System.ComponentModel.DataAnnotations;

namespace erpsystem.Models
{
    public class Role
    {
        [Key]
        public int RoleId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; }
    }
}
