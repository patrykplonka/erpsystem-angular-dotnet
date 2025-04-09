namespace erpsystem.Server.Models
{
    public enum WarehouseMovementType
    {
        PZ,  // Przyjęcie Zewnętrzne
        PW,  // Przyjęcie Wewnętrzne
        WZ,  // Wydanie Zewnętrzne
        RW,  // Rozchód Wewnętrzny
        MM,  // Przesunięcie Międzymagazynowe
        ZW,  // Zwrot Wewnętrzny
        ZK,  // Zwrot Konsygnacyjny
        INW  // Inwentaryzacja
    }
}