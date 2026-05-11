<?php
class Transaction {
    private $conn;
    private $table_name = "transactions";

    public $id;
    public $wallet_id;
    public $amount;
    public $type;
    public $description;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get transactions by wallet ID
    public function getByWalletId($wallet_id, $limit = 10) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE wallet_id = ? 
                  ORDER BY created_at DESC 
                  LIMIT " . intval($limit);
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $wallet_id);
        $stmt->execute();
        return $stmt;
    }
}
?>
