fn main() {
    println!("Counter demo program");
    
    let mut counter = 0;
    
    for i in 1..=5 {
        counter += i;
        println!("Step {}: counter = {}", i, counter);
    }
    
    println!("Final counter value: {}", counter);
}