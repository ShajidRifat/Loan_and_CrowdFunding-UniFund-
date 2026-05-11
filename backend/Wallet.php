<?php
class Wallet {
    private $conn;
    private $table_name = "wallets";
    private $transaction_table = "transactions";

    public $id;
    public $user_id;
    public $currency;
    public $balance;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create wallet for new user
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        
        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get wallet balance and details
    public function getByUserId($user_id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE user_id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $user_id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if($row) {
            $this->id = $row['id'];
            $this->user_id = $row['user_id'];
            $this->balance = $row['balance'];
            return $row;
        }
        return false;
    }

    // Process a transaction (Deposit, Withdrawal, Transfer)
    // This handles both the Balance update and Transaction record atomically
    public function processTransaction($amount, $type, $description, $ref_type = null, $ref_id = null, $related_wallet_id = null) {
        try {
            $this->conn->beginTransaction();

            // 1. Record the transaction
            $query_trans = "INSERT INTO " . $this->transaction_table . "
                          (wallet_id, related_wallet_id, amount, type, reference_type, reference_id, description)
                          VALUES (:wallet_id, :related_wallet_id, :amount, :type, :ref_type, :ref_id, :desc)";
            
            $stmt_trans = $this->conn->prepare($query_trans);
            $stmt_trans->bindParam(":wallet_id", $this->id);
            $stmt_trans->bindParam(":related_wallet_id", $related_wallet_id);
            $stmt_trans->bindParam(":amount", $amount);
            $stmt_trans->bindParam(":type", $type);
            $stmt_trans->bindParam(":ref_type", $ref_type);
            $stmt_trans->bindParam(":ref_id", $ref_id);
            $stmt_trans->bindParam(":desc", $description);
            $stmt_trans->execute();

            // 2. Update wallet balance
            // For deposits/credits, amount is positive. For debits, amount is negative.
            $query_wallet = "UPDATE " . $this->table_name . " SET balance = balance + :amount WHERE id = :id";
            $stmt_wallet = $this->conn->prepare($query_wallet);
            $stmt_wallet->bindParam(":amount", $amount);
            $stmt_wallet->bindParam(":id", $this->id);
            $stmt_wallet->execute();

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            return false;
        }
    }
}
?>
