using System.ComponentModel.DataAnnotations;

namespace erpsystem.Server.Models
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
